const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerUser);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', loginUser);

// @route   GET /api/auth/test
// @desc    Test route
// @access  Public
router.get('/test', (req, res) => {
    res.json({ 
        message: 'Auth route is working',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;

// Import middleware
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// @route   GET /api/auth/profile
// @desc    Get user profile (protected route)
// @access  Private
router.get('/profile', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Protected route accessed successfully',
        user: req.user
    });
});

// @route   GET /api/auth/admin-test
// @desc    Admin only route (protected by role)
// @access  Private/Admin
router.get('/admin-test', 
    authenticateToken, 
    authorizeRole('provider'), 
    (req, res) => {
        res.json({
            success: true,
            message: 'Admin route accessed successfully',
            user: req.user
        });
    }
);
