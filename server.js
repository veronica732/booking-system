const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { pool } = require('./config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Import routes
const authRoutes = require('./routes/auth');
const availabilityRoutes = require('./routes/availability');
const serviceRoutes = require('./routes/services');
const bookingRoutes = require('./routes/bookings');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);

// Basic route
app.get('/', (req, res) => {
    res.json({
        message: 'Booking System API',
        status: 'running',
        database: 'PostgreSQL',
        endpoints: {
            auth: '/api/auth',
            services: '/api/services',
            availability: '/api/availability',
            bookings: '/api/bookings',
            health: '/health'
        }
    });
});

// Health check
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT NOW()');
        res.json({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // Test database connection first
        const client = await pool.connect();
        console.log('✅ Database connection successful');
        client.release();
        
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 URL: ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}`);
        });
        
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('Server cannot start without database connection');
        process.exit(1);
    }
};

startServer();
