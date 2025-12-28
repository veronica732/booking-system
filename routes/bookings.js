const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
    getAvailableSlots, 
    bookSlot, 
    getCustomerBookings,
    getProviderAppointments,
    cancelBooking,
    rescheduleBooking 
} = require('../controllers/bookingController');

// @route   GET /api/bookings/available
// @desc    Get available slots for customers (PUBLIC)
// @access  Public
router.get('/available', getAvailableSlots);

// @route   POST /api/bookings
// @desc    Book an available slot (CUSTOMER ONLY)
// @access  Private/Customer
router.post('/', authenticateToken, bookSlot);

// @route   GET /api/bookings/my-bookings
// @desc    Get customer's bookings
// @access  Private/Customer
router.get('/my-bookings', authenticateToken, getCustomerBookings);

// @route   GET /api/bookings/provider-appointments
// @desc    Get provider's appointments (PROVIDER ONLY)
// @access  Private/Provider
router.get('/provider-appointments', authenticateToken, getProviderAppointments);

// @route   DELETE /api/bookings/cancel
// @desc    Cancel a booking (CUSTOMER ONLY)
// @access  Private/Customer
router.delete('/cancel', authenticateToken, cancelBooking);

// @route   PUT /api/bookings/reschedule
// @desc    Reschedule a booking to new time slot (CUSTOMER ONLY)
// @access  Private/Customer
router.put('/reschedule', authenticateToken, rescheduleBooking);

// @route   GET /api/bookings/test
// @desc    Test route
// @access  Public
router.get('/test', (req, res) => {
    res.json({ 
        message: 'Bookings route is working',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
