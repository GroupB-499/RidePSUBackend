const express = require('express');
const authController = require('./controllers/auth_controller');
const scheduleController = require('./controllers/schedule_controller');
const bookingController = require('./controllers/booking_controller');
const locationsController = require('./controllers/locations_controller');
const ratingsController = require('./controllers/ratings_controller');

const router = express.Router();

// Auth & User Profiling routes
router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.get('/getUsers', authController.getUsers);
router.get('/getDrivers', authController.getDrivers);
router.post('/signup', authController.signup);
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password', authController.resetPassword);
router.put('/edit-user', authController.editUser);
router.get('/get-user-by-id/:userId', authController.getUserById);
router.get('/check-email/:email', authController.checkEmailValidity);
router.patch('/enable', authController.enableAllUsers);
router.patch('/update-user-status/:userId', authController.updateUserStatus);
router.delete('/delete-user/:userId', authController.deleteUser);

// Schedules
router.post('/add-driver', scheduleController.addDriver);
router.get('/get-schedules', scheduleController.getSchedules);
router.post('/add-schedule', scheduleController.addSchedule);
router.put('/update-schedule/:id', scheduleController.updateSchedule);
router.delete('/delete-schedule/:id', scheduleController.deleteSchedule);
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

// Ratings
router.post('/submit-rating', ratingsController.submitRatings);
router.patch('/update-rating/:id', ratingsController.replyToRating);
router.get('/get-ratings', ratingsController.getRatings);
router.get('/get-my-ratings/:userId', ratingsController.getMyRatings);


module.exports = router;
