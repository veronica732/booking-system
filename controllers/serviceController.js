const { pool } = require('../config/database');

// Create a new service (Provider only)
const createService = async (req, res) => {
    try {
        // Only providers can create services
        if (req.user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Only providers can create services'
            });
        }

        const { name, description, price, location_id } = req.body;

        // Validate input
        if (!name || !price) {
            return res.status(400).json({
                success: false,
                message: 'Service name and price are required'
            });
        }

        // Insert new service
        const query = `
            INSERT INTO services 
            (providerid, locationid, name, description, price)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const result = await pool.query(query, [
            req.user.userId,
            location_id || null,
            name,
            description || '',
            price
        ]);

        res.status(201).json({
            success: true,
            message: 'Service created successfully',
            service: result.rows[0]
        });

    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get all services (available to everyone)
const getServices = async (req, res) => {
    try {
        const query = `
            SELECT s.*, u.name as provider_name, l.name as location_name
            FROM services s
            LEFT JOIN users u ON s.providerid = u.userid
            LEFT JOIN locations l ON s.locationid = l.locationid
            ORDER BY s.name
        `;

        const result = await pool.query(query);

        res.json({
            success: true,
            count: result.rows.length,
            services: result.rows
        });

    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get provider's own services
const getProviderServices = async (req, res) => {
    try {
        if (req.user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Only providers can view their services'
            });
        }

        const query = `
            SELECT s.*, l.name as location_name
            FROM services s
            LEFT JOIN locations l ON s.locationid = l.locationid
            WHERE s.providerid = $1
            ORDER BY s.name
        `;

        const result = await pool.query(query, [req.user.userId]);

        res.json({
            success: true,
            count: result.rows.length,
            services: result.rows
        });

    } catch (error) {
        console.error('Get provider services error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    createService,
    getServices,
    getProviderServices
};
