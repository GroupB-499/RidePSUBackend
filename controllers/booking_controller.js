const { db } = require('../firebase');


const createBooking = async (req, res) => {
    try {
        const { departure, destination, transportType, date, time, userId } = req.body;

        if (!departure || !destination || !transportType || !date || !time || !userId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const bookingRef = db.collection('bookings').doc();
        await bookingRef.set({
            departure,
            destination,
            transportType,
            date,
            time,
            userId,
        });

        res.status(201).json({ message: 'Booking created successfully', bookingId: bookingRef.id });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const bookingCount = async (req, res)=>{
    try {
        const { date, time } = req.query;
        if (!date || !time) {
            return res.status(400).json({ error: 'Date and time are required' });
        }

        const bookingsRef = db.collection('bookings');
        const snapshot = await bookingsRef.where('date', '==', date).where('time', '==', time).get();

        res.json({ count: snapshot.size });
    } catch (error) {
        console.error('Error fetching booking count:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const getBookingsById = async (req, res)=>{
    const userId = req.params.userId;

  try {
    // Get a reference to the 'bookings' collection
    const bookingsRef = db.collection('bookings');
    
    // Query bookings where userId matches the provided userId
    const snapshot = await bookingsRef.where('userId', '==', userId).get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No bookings found for this user.' });
    }

    // Prepare the bookings data to send as response
    const bookings = [];
    snapshot.forEach(doc => {
      bookings.push({ id: doc.id, ...doc.data() });
    });

    // Send the bookings data as response
    res.status(200).json({ bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Error fetching bookings.' });
  }

};

const deleteBooking = async(req, res)=>{
    const bookingId = req.params.userId;
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
