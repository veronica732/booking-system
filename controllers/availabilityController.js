const { pool } = require('../config/database');

// Set provider availability
const setAvailability = async (req, res) => {
    try {
        if (req.user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Only providers can set availability'
            });
        }

        const { service_id, date, start_time, end_time, is_available = true } = req.body;

        if (!service_id || !date || !start_time || !end_time) {
            return res.status(400).json({
                success: false,
                message: 'Service ID, date, start time, and end time are required'
            });
        }

        const serviceCheck = await pool.query(
            'SELECT * FROM services WHERE serviceid = $1 AND providerid = $2',
            [service_id, req.user.userId]
        );

        if (serviceCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or you do not own this service'
            });
        }

        // Check for overlapping availability
        const overlapCheck = await pool.query(`
            SELECT * FROM availability 
            WHERE serviceid = $1 
            AND date = $2 
            AND providerid = $3
            AND (
                (starttime <= $4 AND endtime > $4) OR
                (starttime < $5 AND endtime >= $5) OR
                (starttime >= $4 AND endtime <= $5)
            )
        `, [service_id, date, req.user.userId, start_time, end_time]);

        if (overlapCheck.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Time slot overlaps with existing availability',
                overlapping_slots: overlapCheck.rows
            });
        }

        const query = `
            INSERT INTO availability 
            (serviceid, providerid, date, starttime, endtime, isavailable)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await pool.query(query, [
            service_id,
            req.user.userId,
            date,
            start_time,
            end_time,
            is_available
        ]);

        res.status(201).json({
            success: true,
            message: 'Availability slot added successfully',
            availability: result.rows[0]
        });

    } catch (error) {
        console.error('Set availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get provider's availability
const getProviderAvailability = async (req, res) => {
    try {
        const providerId = req.user.userId;
        
        const query = `
            SELECT a.*, s.name as service_name, s.price,
                   COUNT(b.bookingid) as booked_count,
                   CASE 
                     WHEN COUNT(b.bookingid) > 0 THEN false 
                     ELSE a.isavailable 
                   END as is_available_now
            FROM availability a
            JOIN services s ON a.serviceid = s.serviceid
            LEFT JOIN bookings b ON a.serviceid = b.serviceid 
                AND a.date = b.date 
                AND b.starttime >= a.starttime 
                AND b.endtime <= a.endtime
                AND b.status != 'cancelled'
            WHERE a.providerid = $1
            GROUP BY a.availabilityid, s.serviceid
            ORDER BY a.date, a.starttime
        `;

        const result = await pool.query(query, [providerId]);

        res.json({
            success: true,
            count: result.rows.length,
            availability: result.rows
        });

    } catch (error) {
        console.error('Get availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get availability for a specific service (Public)
const getServiceAvailability = async (req, res) => {
    try {
        const { service_id } = req.params;
        const { date } = req.query;

        let query = `
            SELECT a.*,
                   COUNT(b.bookingid) as booked_count,
                   CASE 
                     WHEN COUNT(b.bookingid) > 0 THEN false 
                     ELSE a.isavailable 
                   END as is_available_now
            FROM availability a
            LEFT JOIN bookings b ON a.serviceid = b.serviceid 
                AND a.date = b.date 
                AND b.starttime >= a.starttime 
                AND b.endtime <= a.endtime
                AND b.status != 'cancelled'
            WHERE a.serviceid = $1
                AND a.isavailable = true
                AND a.date >= CURRENT_DATE
        `;

        const params = [service_id];

        if (date) {
            query += ' AND a.date = $2';
            params.push(date);
        }

        query += ' GROUP BY a.availabilityid ORDER BY a.date, a.starttime';

        const result = await pool.query(query, params);

        res.json({
            success: true,
            count: result.rows.length,
            availability: result.rows
        });

    } catch (error) {
        console.error('Get service availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Update availability slot
const updateAvailability = async (req, res) => {
    try {
        if (req.user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Only providers can update availability'
            });
        }

        const { id } = req.params;
        const { date, start_time, end_time, is_available } = req.body;

        const checkQuery = `
            SELECT * FROM availability 
            WHERE availabilityid = $1 AND providerid = $2
        `;
        const checkResult = await pool.query(checkQuery, [id, req.user.userId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Availability not found or you do not have permission'
            });
        }

        const updateQuery = `
            UPDATE availability 
            SET date = COALESCE($1, date),
                starttime = COALESCE($2, starttime),
                endtime = COALESCE($3, endtime),
                isavailable = COALESCE($4, isavailable)
            WHERE availabilityid = $5 AND providerid = $6
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [
            date,
            start_time,
            end_time,
            is_available,
            id,
            req.user.userId
        ]);

        res.json({
            success: true,
            message: 'Availability updated successfully',
            availability: result.rows[0]
        });

    } catch (error) {
        console.error('Update availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Delete availability slot
const deleteAvailability = async (req, res) => {
    try {
        if (req.user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Only providers can delete availability'
            });
        }

        const { id } = req.params;

        const checkQuery = `
            SELECT * FROM availability 
            WHERE availabilityid = $1 AND providerid = $2
        `;
        const checkResult = await pool.query(checkQuery, [id, req.user.userId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Availability not found or you do not have permission'
            });
        }

        const availability = checkResult.rows[0];
        const bookingsCheck = await pool.query(`
            SELECT COUNT(*) FROM bookings 
            WHERE serviceid = $1 
            AND date = $2 
            AND starttime >= $3 
            AND endtime <= $4
            AND status != 'cancelled'
        `, [availability.serviceid, availability.date, availability.starttime, availability.endtime]);

        const bookingCount = parseInt(bookingsCheck.rows[0].count);
        if (bookingCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete availability with ${bookingCount} existing booking(s)`
            });
        }

        const deleteQuery = `
            DELETE FROM availability 
            WHERE availabilityid = $1 AND providerid = $2
            RETURNING *
        `;

        const result = await pool.query(deleteQuery, [id, req.user.userId]);

        res.json({
            success: true,
            message: 'Availability deleted successfully'
        });

    } catch (error) {
        console.error('Delete availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    setAvailability,
    getProviderAvailability,
    getServiceAvailability,
    updateAvailability,
    deleteAvailability
};
