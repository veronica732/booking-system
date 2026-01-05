const { pool } = require('../config/database');

const createService = async (req, res) => {
    try {
        if (req.user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Only providers can create services'
            });
        }

        const { name, description, price, location_id } = req.body;

        if (!name || !price) {
            return res.status(400).json({
                success: false,
                message: 'Service name and price are required'
            });
        }

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

const updateService = async (req, res) => {
    try {
        if (req.user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Only providers can update services'
            });
        }

        const { id } = req.params;
        const { name, description, price, location_id } = req.body;

        const checkQuery = `
            SELECT * FROM services 
            WHERE serviceid = $1 AND providerid = $2
        `;
        const checkResult = await pool.query(checkQuery, [id, req.user.userId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or you do not have permission'
            });
        }

        const updateQuery = `
            UPDATE services 
            SET name = COALESCE($1, name),
                description = COALESCE($2, description),
                price = COALESCE($3, price),
                locationid = COALESCE($4, locationid)
            WHERE serviceid = $5 AND providerid = $6
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [
            name,
            description,
            price,
            location_id,
            id,
            req.user.userId
        ]);

        res.json({
            success: true,
            message: 'Service updated successfully',
            service: result.rows[0]
        });

    } catch (error) {
        console.error('Update service error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

const deleteServiceById = async (req, res) => {
    try {
        console.log('=== DELETE START ===');
        console.log('req.user:', req.user);
        console.log('req.params:', req.params);
        
        if (!req.user) {
            console.log('ERROR: req.user is undefined!');
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        if (req.user.role !== 'provider') {
            console.log('User role:', req.user.role);
            return res.status(403).json({
                success: false,
                message: 'Only providers can delete services'
            });
        }

        const { id } = req.params;
        console.log('Deleting service ID:', id);

        const checkQuery = `
            SELECT * FROM services 
            WHERE serviceid = $1 AND providerid = $2
        `;
        const checkResult = await pool.query(checkQuery, [id, req.user.userId]);
        console.log('Service check result:', checkResult.rows);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or you do not have permission'
            });
        }

        const bookingsCheck = await pool.query(
            'SELECT COUNT(*) FROM bookings WHERE serviceid = $1',
            [id]
        );
        
        const bookingCount = parseInt(bookingsCheck.rows[0].count);
        if (bookingCount > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot delete service with ${bookingCount} existing booking(s). Cancel bookings first.` 
            });
        }

        const reviewsCheck = await pool.query(
            'SELECT COUNT(*) FROM reviews WHERE serviceid = $1',
            [id]
        );
        
        const reviewCount = parseInt(reviewsCheck.rows[0].count);
        if (reviewCount > 0) {
            await pool.query('DELETE FROM reviews WHERE serviceid = $1', [id]);
        }

        // DELETE FROM AVAILABILITY FIRST
        console.log('Deleting from availability table...');
        await pool.query('DELETE FROM availability WHERE serviceid = $1', [id]);

        const deleteQuery = `
            DELETE FROM services 
            WHERE serviceid = $1 AND providerid = $2
            RETURNING *
        `;

        const result = await pool.query(deleteQuery, [id, req.user.userId]);
        console.log('Service deleted successfully');

        res.json({
            success: true,
            message: 'Service deleted successfully'
        });

    } catch (error) {
        console.log('=== DELETE ERROR ===');
        console.error('Full error:', error);
        console.error('Error stack:', error.stack);
        
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
    getProviderServices,
    updateService,
    deleteServiceById
};
