const express = require('express');
const authController = require('./controllers/auth_controller');
const scheduleController = require('./controllers/schedule_controller');
const bookingController = require('./controllers/booking_controller');
const locationsController = require('./controllers/locations_controller');

const router = express.Router();

// Auth & User Profiling routes
router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password', authController.resetPassword);
router.put('/edit-user', authController.editUser);

// Schedules
router.get('/get-schedules', scheduleController.getSchedules);
router.post('/add-schedule', scheduleController.addSchedule);
router.post('/add-driver', scheduleController.addDriver);
router.get('/get-driver-schedules', scheduleController.getSchedulesByDriverId);

// Bookings
router.post('/create-booking', bookingController.createBooking);
router.get('/booking-count', bookingController.bookingCount);
router.get('/get-bookings/:userId', bookingController.getBookingsById);
router.delete('/delete-booking', bookingController.deleteBooking);

// Locations
router.get('/locations', locationsController.fetchLocations);

module.exports = router;
