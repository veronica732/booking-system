const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { testConnection, checkTables } = require('./config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));  // ← ADD THIS LINE

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
            health: '/health',
            tables: '/api/tables',
            dashboard: '/index.html'
        }
    });
});

// Health check with database test
app.get('/health', async (req, res) => {
    const dbStatus = await testConnection();
    res.json({
        status: 'healthy',
        database: dbStatus ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        system: 'PostgreSQL'
    });
});

// List all tables in database
app.get('/api/tables', async (req, res) => {
    try {
        const tables = await checkTables();
        res.json({
            success: true,
            database: process.env.DB_NAME,
            tables: tables,
            count: tables.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: ${process.env.DB_NAME} (PostgreSQL)`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/index.html`);
    
    // Test database connection on startup
    const connected = await testConnection();
    if (connected) {
        await checkTables();
    }
});
