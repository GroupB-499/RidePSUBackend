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
router.get('/get-user-by-id/:userId', authController.getUserById);
router.get('/check-email/:email', authController.checkEmailValidity);

// Schedules
router.post('/add-driver', scheduleController.addDriver);
router.get('/get-schedules', scheduleController.getSchedules);
router.post('/add-schedule', scheduleController.addSchedule);
router.get('/get-driver-schedules', scheduleController.getSchedulesByDriverId);
router.get('/get-notifications/:userId', scheduleController.getNotificationsById);

// Bookings
router.post('/create-booking', bookingController.createBooking);
router.get('/booking-count', bookingController.bookingCount);
router.get('/get-bookings/:userId', bookingController.getBookingsById);
router.get('/get-upcoming-booking/:userId', bookingController.getLatestBooking);
router.get('/get-upcoming-driver-booking/:userId', bookingController.getLatestDriverBooking);
router.delete('/delete-booking', bookingController.deleteBooking);
router.post('/saveFCMTokens', bookingController.saveFCMToken);
router.post('/update-delay-time', bookingController.delayBooking);

// Locations
router.get('/locations', locationsController.fetchLocations);
router.get('/geo-location', locationsController.fetchGeoLocation);


module.exports = router;
