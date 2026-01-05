const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    createService,
    getServices,
    getProviderServices,
    updateService,
    deleteServiceById
} = require('../controllers/serviceController');

// Create a new service (Provider only)
router.post('/', authenticateToken, createService);

// Get all services (Public)
router.get('/', getServices);

// Get provider's own services
router.get('/provider', authenticateToken, getProviderServices);

// Update service by ID
router.put('/:id', authenticateToken, updateService);

// Delete service by ID
router.delete('/:id', authenticateToken, deleteServiceById);

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Services route is working', timestamp: new Date().toISOString() });
});

module.exports = router;
