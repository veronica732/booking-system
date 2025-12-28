const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { setAvailability, getProviderAvailability } = require('../controllers/availabilityController');

// @route   POST /api/availability
// @desc    Set provider availability (PROVIDER ONLY)
// @access  Private/Provider
router.post('/', authenticateToken, setAvailability);

// @route   GET /api/availability/provider
// @desc    Get provider's availability slots
// @access  Private/Provider
router.get('/provider', authenticateToken, getProviderAvailability);

// @route   GET /api/availability/test
// @desc    Test route
// @access  Public
router.get('/test', (req, res) => {
    res.json({ 
        message: 'Availability route is working',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
