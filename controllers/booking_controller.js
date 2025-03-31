const { db } = require('../firebase');
const { FieldValue } = require('firebase-admin/firestore');

const createBooking = async (req, res) => {
    try {
        const { pickup, dropoff, transportType, date, time, userId } = req.body;

        // Check for missing required fields
        if (!transportType || !date || !time || !userId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Query the schedules table to find the matching scheduleId
        const schedulesRef = db.collection('schedules');
        const querySnapshot = await schedulesRef
            .where('time', '==', time)
            .where('transportType', '==', transportType)
            .where('pickupLocations', 'array-contains', pickup)
            .get();

        if (querySnapshot.empty) {
            return res.status(404).json({ message: 'No matching schedule found' });
        }

        const scheduleDoc = querySnapshot.docs[0];
        const scheduleId = scheduleDoc.id;

        const bookingRef = db.collection('bookings').doc();
        await bookingRef.set({
            bookingId: bookingRef.id,
            date,
            userId,
            scheduleId,
        });

        res.status(201).json({
            message: 'Booking created successfully',
            bookingId: bookingRef.id,
            scheduleId,
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


const bookingCount = async (req, res) => {
    try {
        const { pickup, dropoff, date, time, transportType } = req.query;

        // Check for missing required fields
        if (!date || !time || !transportType) {
            return res.status(400).json({ error: 'Date, time and trasportType are required' });
        }

        const schedulesRef = db.collection('schedules');
        const bookingsRef = db.collection('bookings');

        // Fetch the scheduleId of the document whose time matches the requested time
        const schedulesSnapshot = await schedulesRef
            .where('time', '==', time)
            .where('transportType', '==', transportType)
            .where('pickupLocations', 'array-contains', pickup).get();

        if (schedulesSnapshot.empty) {
            return res.status(404).json({ error: "No booking available!" }); // No schedules found for the time
        }
        console.log(schedulesSnapshot.docs[0]);

        // Extract the scheduleId from the first matching schedule document
        const scheduleId = schedulesSnapshot.docs[0].id;

        console.log(scheduleId);

        // Query bookings to count documents that match both the scheduleId and date
        const bookingsSnapshot = await bookingsRef
            .where('scheduleId', '==', scheduleId)
            .where('date', '==', date)
            .get();

        res.json({ count: bookingsSnapshot.size });
    } catch (error) {
        console.error('Error fetching booking count:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getBookingsById = async (req, res) => {
    const userId = req.params.userId;

    try {
        // Get references to the 'bookings' and 'schedules' collections
        const bookingsRef = db.collection('bookings');
        const schedulesRef = db.collection('schedules');

        // Query bookings where userId matches the provided userId
        const snapshot = await bookingsRef.where('userId', '==', userId).get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No bookings found for this user.' });
        }

        // Prepare the bookings data to send as response
        const bookings = [];
        for (const doc of snapshot.docs) {
            const bookingData = doc.data();
            const scheduleId = bookingData.scheduleId;

            console.log(`Schedulessssssss  ${scheduleId}`)

            // Fetch the corresponding schedule details
            const scheduleDoc = await schedulesRef.doc(scheduleId).get();

            if (scheduleDoc.exists) {
                const scheduleData = scheduleDoc.data();

                // Combine booking and schedule data
                bookings.push({
                    bookingId: doc.id, // Include the bookingId
                    date: bookingData.date,
                    time: scheduleData.time,
                    pickup: scheduleData.pickupLocations[0], // Fetch pickup from schedule
                    dropoff: scheduleData.dropoffLocations[0], // Fetch dropoff from schedule
                    transportType: scheduleData.transportType, // Fetch transportType from schedule
                });
            }
        }

        // Send the bookings data as response
        res.status(200).json({ bookings });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Error fetching bookings.' });
    }
};

const deleteBooking = async (req, res) => {
    const { bookingId } = req.query;
    console.log(bookingId);
    try {
        // Get a reference to the booking document
        const bookingRef = db.collection('bookings').doc(bookingId);

        // Delete the booking
        await bookingRef.delete();

        res.status(200).json({ message: 'Booking deleted successfully.' });
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ message: 'Error deleting booking.' });
    }
};

const getLatestBooking = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const now = new Date();
        const today = now.toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
        const currentTime = now.getTime();
        // const currentTime = 1742097600000;

        // Fetch bookings for today
        const bookingSnapshot = await db.collection('bookings')
            .where('userId', '==', userId)
            .where('date', '>=', today)
            .orderBy('date')
            .get();

        if (bookingSnapshot.empty) {
            return res.status(404).json({ message: 'No upcoming bookings found' });
        }

        let upcomingBooking = null;
        let minTime = Infinity;
        
        var currentBookingFlag = false;

        for (const doc of bookingSnapshot.docs) { 
            const booking = doc.data();

            const bookingDateDb = booking.date.split("-");
            const bookingYear = Number(bookingDateDb[0]);
            const bookingMonth = Number(bookingDateDb[1]);
            const bookingDay = Number(bookingDateDb[2]);

            // Fetch schedule details
            const scheduleRef = db.collection('schedules').doc(booking.scheduleId);
            const scheduleDoc = await scheduleRef.get();
            const scheduleData = scheduleDoc.data();

            const scheduleTimeDb = scheduleData.time.split(":");
            const scheduleTimeHour = Number(scheduleTimeDb[0]);
            const scheduleTimeMinutes = Number(scheduleTimeDb[1]);

            const bookingDate = new Date(bookingYear, bookingMonth-1, bookingDay, scheduleTimeHour, scheduleTimeMinutes, 0, 0);

            const bookingTime = bookingDate.getTime();

            console.log(bookingTime);
            console.log(currentTime);
            // Check if booking time is in the future (but not expired)

            if (currentTime >= bookingTime && currentTime <= (bookingTime + 600)) { // 600 means 10 minutes in epoch time
                console.log("ahsdhashd");
                upcomingBooking = {
                    id: doc.id,
                    date: booking.date,
                    driverId: scheduleData.driverId,
                    time: scheduleData.time,
                    pickup: scheduleData.pickupLocations[0],
                    dropoff: scheduleData.dropoffLocations[0],
                    transportType: scheduleData.transportType
                };
                currentBookingFlag = true;
            } else if (bookingTime > currentTime) {
                if(!currentBookingFlag){
                    if (bookingTime < minTime) {
                console.log("a1232");

                        minTime = bookingTime;
                        upcomingBooking = {
                            id: doc.id,
                            date: booking.date,
                            driverId: scheduleData.driverId,
                            time: scheduleData.time,
                            pickup: scheduleData.pickupLocations[0],
                            dropoff: scheduleData.dropoffLocations[0],
                            transportType: scheduleData.transportType
                        };
                    }
                }
                
            }

        };

        console.log('COMSOMDSOMDOS');

        if (!upcomingBooking) {
            return res.status(404).json({ message: "No valid upcoming booking found" });
        }



        return res.json({ booking: upcomingBooking });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
const getLatestDriverBooking = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ error: "Driver ID is required" });
        }

        const now = new Date();
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: "Asia/Riyadh" };
        const currentDate = now.toLocaleDateString('en-CA', options); // Format: YYYY-MM-DD

        const currentTime = now.toLocaleTimeString('en-GB', { hour12: false, timeZone: "Asia/Riyadh" }); // Format: HH:MM:SS

        let minTime = "24:00";


        const snapshot = await db.collection("schedules")
            .where("driverId", "==", userId)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({ message: "No upcoming bookings found" });
        }

        // Filter upcoming bookings
        let upcomingBooking = null;
        let currentBookingFlag = false;

        snapshot.forEach(doc => {
            const schedule = doc.data();

            const bookingTime = schedule.time;
            const bookingHour = bookingTime.split(":")[0];
            const bookingMinutes = bookingTime.split(":")[1];
            const endTime = bookingHour + ":" + (Number(bookingMinutes) + 10)

            console.log(currentDate)
            console.log(currentTime)
            console.log(bookingTime)
            console.log(endTime)

            // Booking should be within current time and 10 minutes after, and should be the closest one
            if (currentTime >= bookingTime && currentTime <= endTime) {
                console.log("FETCHING CURRENT BOOKING!")
                upcomingBooking = {
                    id: doc.id,
                    date: currentDate,
                    time: schedule.time,
                    pickup: schedule.pickupLocations[0],
                    dropoff: schedule.dropoffLocations[0],
                    transportType: schedule.transportType
                };
                currentBookingFlag = true;
            } else if (bookingTime < currentTime) {
                console.log("FETCHING CURRENT BOOKING12!")
                if(!currentBookingFlag){
                    if (bookingTime < minTime) {
                        minTime = bookingTime;
                        upcomingBooking = {
                            id: doc.id,
                            date: currentDate,
                            time: schedule.time,
                            pickup: schedule.pickupLocations[0],
                            dropoff: schedule.dropoffLocations[0],
                            transportType: schedule.transportType
                        };
                    }
                }
                
            }
        });

        if (!upcomingBooking) {
            return res.status(404).json({ message: "No upcoming bookings found" });
        }

        res.status(200).json({ booking: upcomingBooking });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const saveFCMToken = async (req, res) => {
    const { userId, role, token } = req.body;

    if (!userId || !role || !token) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const userRef = db.collection('fcmTokens').doc(userId);

        const doc = await userRef.get();
        if (doc.exists) {
            // Append new token if it's not already stored
            await userRef.update({
                tokens: FieldValue.arrayUnion(token)
            });
        } else {
            // Create a new entry if userId does not exist
            await userRef.set({ userId, role, tokens: [token] });
        }

        res.json({ message: 'FCM token saved successfully' });
    } catch (error) {
        console.error('Error saving token:', error);
        res.status(500).json({ error: 'Failed to save FCM token' });
    }
};
const delayBooking = async (req, res) => {
    try {
        const { scheduleId, delayTime } = req.body;

        if (!scheduleId || delayTime === undefined) {
            return res.status(400).json({ error: "Booking ID and delay time are required" });
        }

        const bookingsRef = db.collection('bookings');
        const snapshot = await bookingsRef.where('scheduleId', '==', scheduleId).get();

        if (snapshot.empty) {
            return res.status(404).json({ error: "No bookings found for the given scheduleId" });
        }

        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.update(doc.ref, { delayTime });
        });

        await batch.commit();

        res.status(200).json({ message: "Delay time updated successfully for matching bookings" });
    } catch (error) {
        console.error('Error updating delay time:', error);
        res.status(500).json({ error: error.message });
    }
};





module.exports = {
    createBooking,
    bookingCount,
    delayBooking,
    getBookingsById,
    deleteBooking,
    saveFCMToken,
    getLatestDriverBooking,
    getLatestBooking,
};
