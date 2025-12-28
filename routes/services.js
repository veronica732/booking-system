const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createService, getServices, getProviderServices } = require('../controllers/serviceController');

// @route   POST /api/services
// @desc    Create a new service (PROVIDER ONLY)
// @access  Private/Provider
router.post('/', authenticateToken, createService);

// @route   GET /api/services
// @desc    Get all services (PUBLIC)
// @access  Public
router.get('/', getServices);

// @route   GET /api/services/provider
// @desc    Get provider's own services
// @access  Private/Provider
router.get('/provider', authenticateToken, getProviderServices);

// @route   GET /api/services/test
// @desc    Test route
// @access  Public
router.get('/test', (req, res) => {
    res.json({ 
        message: 'Services route is working',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
