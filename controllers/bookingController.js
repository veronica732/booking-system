const { pool } = require('../config/database');

// Get available slots for customers
const getAvailableSlots = async (req, res) => {
    try {
        const { service_id, date } = req.query;

        let query = `
            SELECT 
                a.availabilityid,
                a.date,
                a.starttime,
                a.endtime,
                a.isavailable,
                s.serviceid,
                s.name as service_name,
                s.description,
                s.price,
                u.name as provider_name
            FROM availability a
            JOIN services s ON a.serviceid = s.serviceid
            JOIN users u ON s.providerid = u.userid
            WHERE a.isavailable = true
        `;

        const params = [];
        
        if (service_id) {
            params.push(service_id);
            query += ` AND s.serviceid = $${params.length}`;
        }
        
        if (date) {
            params.push(date);
            query += ` AND a.date = $${params.length}`;
        }

        query += ' ORDER BY a.date, a.starttime';

        const result = await pool.query(query, params);

        res.json({
            success: true,
            count: result.rows.length,
            slots: result.rows
        });

    } catch (error) {
        console.error('Get available slots error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Book a slot
const bookSlot = async (req, res) => {
    try {
        const { availability_id } = req.body;
        const customerId = req.user.userId;

        if (!availability_id) {
            return res.status(400).json({
                success: false,
                message: 'Availability ID is required'
            });
        }

        // Start transaction
        await pool.query('BEGIN');

        // Check if slot is available
        const slotCheck = await pool.query(
            'SELECT * FROM availability WHERE availabilityid = $1 AND isavailable = true FOR UPDATE',
            [availability_id]
        );

        if (slotCheck.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Slot is not available or does not exist'
            });
        }

        const slot = slotCheck.rows[0];

        // Create booking
        const bookingQuery = `
            INSERT INTO bookings 
            (userid, serviceid, date, status)
            VALUES ($1, $2, $3, 'confirmed')
            RETURNING *
        `;

        const bookingResult = await pool.query(bookingQuery, [
            customerId,
            slot.serviceid,
            slot.date
        ]);

        // Update availability to unavailable
        await pool.query(
            'UPDATE availability SET isavailable = false WHERE availabilityid = $1',
            [availability_id]
        );

        // Commit transaction
        await pool.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Booking confirmed successfully',
            booking: bookingResult.rows[0],
            slot: {
                id: slot.availabilityid,
                date: slot.date,
                start_time: slot.starttime,
                end_time: slot.endtime
            }
        });

    } catch (error) {
        await pool.query('ROLLBACK').catch(() => {});
        console.error('Booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Booking failed',
            error: error.message
        });
    }
};

// Get customer's bookings
const getCustomerBookings = async (req, res) => {
    try {
        const customerId = req.user.userId;

        const query = `
            SELECT 
                b.bookingid,
                b.date as booking_date,
                b.status,
                b.created_at,
                s.name as service_name,
                s.description,
                s.price,
                a.starttime,
                a.endtime,
                u.name as provider_name
            FROM bookings b
            JOIN services s ON b.serviceid = s.serviceid
            JOIN availability a ON b.serviceid = a.serviceid AND b.date = a.date
            JOIN users u ON s.providerid = u.userid
            WHERE b.userid = $1
            ORDER BY b.date DESC, b.created_at DESC
        `;

        const result = await pool.query(query, [customerId]);

        res.json({
            success: true,
            count: result.rows.length,
            bookings: result.rows
        });

    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get provider's appointments
const getProviderAppointments = async (req, res) => {
    try {
        if (req.user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Only providers can view appointments'
            });
        }

        const providerId = req.user.userId;

        const query = `
            SELECT 
                b.bookingid,
                b.date as booking_date,
                b.status,
                b.created_at,
                s.name as service_name,
                s.price,
                a.starttime,
                a.endtime,
                u.name as customer_name,
                u.email as customer_email
            FROM bookings b
            JOIN services s ON b.serviceid = s.serviceid
            JOIN availability a ON b.serviceid = a.serviceid AND b.date = a.date
            JOIN users u ON b.userid = u.userid
            WHERE s.providerid = $1
            ORDER BY b.date DESC, a.starttime DESC
        `;

        const result = await pool.query(query, [providerId]);

        res.json({
            success: true,
            count: result.rows.length,
            appointments: result.rows
        });

    } catch (error) {
        console.error('Get provider appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Cancel a booking - FIXED VERSION
const cancelBooking = async (req, res) => {
    try {
        const { booking_id } = req.body;
        const userId = req.user.userId;

        if (!booking_id) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID is required'
            });
        }

        // Start transaction
        await pool.query('BEGIN');

        // Get booking details and verify ownership - SIMPLIFIED QUERY
        const bookingQuery = `
            SELECT b.* 
            FROM bookings b
            WHERE b.bookingid = $1 AND b.userid = $2
            FOR UPDATE
        `;
        
        const bookingResult = await pool.query(bookingQuery, [booking_id, userId]);

        if (bookingResult.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Booking not found or you do not have permission to cancel it'
            });
        }

        const booking = bookingResult.rows[0];

        // Check if booking can be cancelled (e.g., not in the past)
        const bookingDate = new Date(booking.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (bookingDate < today) {
            await pool.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel past bookings'
            });
        }

        // Find the associated availability slot
        const availabilityQuery = `
            SELECT a.availabilityid 
            FROM availability a
            WHERE a.serviceid = $1 AND a.date = $2
            FOR UPDATE
        `;
        
        const availabilityResult = await pool.query(availabilityQuery, [booking.serviceid, booking.date]);
        const availabilityId = availabilityResult.rows[0]?.availabilityid;

        // Delete the booking
        await pool.query('DELETE FROM bookings WHERE bookingid = $1', [booking_id]);

        // Make the availability slot available again if it exists
        if (availabilityId) {
            await pool.query(
                'UPDATE availability SET isavailable = true WHERE availabilityid = $1',
                [availabilityId]
            );
        }

        // Commit transaction
        await pool.query('COMMIT');

        res.json({
            success: true,
            message: 'Booking cancelled successfully',
            cancelledBooking: {
                id: booking.bookingid,
                service_id: booking.serviceid,
                date: booking.date
            }
        });

    } catch (error) {
        await pool.query('ROLLBACK').catch(() => {});
        console.error('Cancel booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during cancellation',
            error: error.message
        });
    }
};

// Reschedule a booking
const rescheduleBooking = async (req, res) => {
    try {
        const { booking_id, new_availability_id } = req.body;
        const userId = req.user.userId;

        if (!booking_id || !new_availability_id) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID and new availability ID are required'
            });
        }

        // Start transaction
        await pool.query('BEGIN');

        // 1. Get the existing booking and verify ownership
        const bookingQuery = `
            SELECT b.* 
            FROM bookings b
            WHERE b.bookingid = $1 AND b.userid = $2
            FOR UPDATE
        `;
        
        const bookingResult = await pool.query(bookingQuery, [booking_id, userId]);

        if (bookingResult.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Booking not found or you do not have permission to reschedule it'
            });
        }

        const oldBooking = bookingResult.rows[0];

        // 2. Check if booking can be rescheduled (not in the past)
        const bookingDate = new Date(oldBooking.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (bookingDate < today) {
            await pool.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Cannot reschedule past bookings'
            });
        }

        // 3. Check if new availability slot exists and is available
        const newSlotQuery = `
            SELECT a.*, s.serviceid as slot_service_id
            FROM availability a
            JOIN services s ON a.serviceid = s.serviceid
            WHERE a.availabilityid = $1 AND a.isavailable = true
            FOR UPDATE
        `;
        
        const newSlotResult = await pool.query(newSlotQuery, [new_availability_id]);

        if (newSlotResult.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'New time slot is not available or does not exist'
            });
        }

        const newSlot = newSlotResult.rows[0];

        // 4. Verify the new slot is for the same service (optional check)
        if (oldBooking.serviceid !== newSlot.slot_service_id) {
            await pool.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'New time slot must be for the same service'
            });
        }

        // 5. Find the old availability slot
        const oldAvailabilityQuery = `
            SELECT a.availabilityid 
            FROM availability a
            WHERE a.serviceid = $1 AND a.date = $2
            FOR UPDATE
        `;
        
        const oldAvailabilityResult = await pool.query(oldAvailabilityQuery, [oldBooking.serviceid, oldBooking.date]);
        const oldAvailabilityId = oldAvailabilityResult.rows[0]?.availabilityid;

        // 6. Update the booking with new date
        const updateBookingQuery = `
            UPDATE bookings 
            SET date = $1
            WHERE bookingid = $2
            RETURNING *
        `;
        
        const updatedBooking = await pool.query(updateBookingQuery, [newSlot.date, booking_id]);

        // 7. Make old slot available again
        if (oldAvailabilityId) {
            await pool.query(
                'UPDATE availability SET isavailable = true WHERE availabilityid = $1',
                [oldAvailabilityId]
            );
        }

        // 8. Make new slot unavailable
        await pool.query(
            'UPDATE availability SET isavailable = false WHERE availabilityid = $1',
            [new_availability_id]
        );

        // Commit transaction
        await pool.query('COMMIT');

        res.json({
            success: true,
            message: 'Booking rescheduled successfully',
            booking: updatedBooking.rows[0],
            old_slot: {
                date: oldBooking.date,
                availability_id: oldAvailabilityId
            },
            new_slot: {
                date: newSlot.date,
                start_time: newSlot.starttime,
                end_time: newSlot.endtime,
                availability_id: new_availability_id
            }
        });

    } catch (error) {
        await pool.query('ROLLBACK').catch(() => {});
        console.error('Reschedule booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during rescheduling',
            error: error.message
        });
    }
};
module.exports = {
    getAvailableSlots,
    bookSlot,
    getCustomerBookings,
    getProviderAppointments,
    cancelBooking,
    rescheduleBooking
};
