const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    setAvailability,
    getProviderAvailability,
    getServiceAvailability,
    updateAvailability,
    deleteAvailability
} = require('../controllers/availabilityController');

// Set availability (Provider only)
router.post('/', authenticateToken, setAvailability);

// Get provider's own availability (Provider only)
router.get('/provider', authenticateToken, getProviderAvailability);

// Get availability for a service (Public)
router.get('/service/:service_id', getServiceAvailability);

// Update availability slot (Provider only)
router.put('/:id', authenticateToken, updateAvailability);

// Delete availability slot (Provider only)
router.delete('/:id', authenticateToken, deleteAvailability);

module.exports = router;
