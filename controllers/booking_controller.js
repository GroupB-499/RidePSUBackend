const { db } = require('../firebase');

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

module.exports = {
    createBooking,
    bookingCount,
    getBookingsById,
    deleteBooking
};
