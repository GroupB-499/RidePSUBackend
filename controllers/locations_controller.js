const { db } = require('../firebase');

const addLocation = async (req, res) => {
    try {
      const { placeName, latitude, longitude } = req.body;
  
      // Validate required fields
      if (!placeName || !latitude || !longitude) {
        return res.status(400).json({ error: 'placeName, latitude, and longitude are required' });
      }
  
      // Create a new location document in Firestore
      const locationRef = db.collection('locations').doc();
      await locationRef.set({
        placeName,
        latitude: parseFloat(latitude), // Ensure latitude is a number
        longitude: parseFloat(longitude), // Ensure longitude is a number
      });
  
      res.status(201).json({
        message: 'Location created successfully',
        locationId: locationRef.id,
      });
    } catch (error) {
      console.error('Error creating location:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };


  const fetchLocations = async (req, res) => {
    try {
      const locationsRef = db.collection('locations');
      const snapshot = await locationsRef.get();
  
      if (snapshot.empty) {
        return res.status(404).json({ message: 'No locations found' });
      }
  
      const locations = [];
      snapshot.forEach(doc => {
        locations.push({
          id: doc.id,
          ...doc.data(),
        });
      });
  
      res.status(200).json({ locations });
    } catch (error) {
      console.error('Error fetching locations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  module.exports = {
    addLocation,
fetchLocations,
  }
  