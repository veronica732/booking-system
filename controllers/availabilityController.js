const { pool } = require('../config/database');

// Set provider availability
const setAvailability = async (req, res) => {
    try {
        // Only providers can set availability
        if (req.user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Only providers can set availability'
            });
        }

        const { service_id, date, start_time, end_time, is_available = true } = req.body;

        // Validate input
        if (!service_id || !date || !start_time || !end_time) {
            return res.status(400).json({
                success: false,
                message: 'Service ID, date, start time, and end time are required'
            });
        }

        // Check if provider owns the service
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

        // Insert availability slot
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
            SELECT a.*, s.name as service_name, s.price
            FROM availability a
            JOIN services s ON a.serviceid = s.serviceid
            WHERE a.providerid = $1
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

module.exports = {
    setAvailability,
    getProviderAvailability
};
