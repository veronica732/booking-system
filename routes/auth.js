const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// @route   POST /api/auth/register
// @access  Public
router.post('/register', registerUser);

// @route   POST /api/auth/login
// @access  Public
router.post('/login', loginUser);

// @route   GET /api/auth/test
// @access  Public
router.get('/test', (req, res) => {
    res.json({ 
        message: 'Auth route is working',
        timestamp: new Date().toISOString()
    });
});

// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Protected route accessed successfully',
        user: req.user
    });
});

// @route   GET /api/auth/admin-test
// @access  Private/Admin
router.get(
    '/admin-test',
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

module.exports = router;

