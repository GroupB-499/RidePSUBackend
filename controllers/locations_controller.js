const { db } = require('../firebase');
const axios = require('axios');

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

  const fetchGeoLocation =  async (req, res) => {
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({ error: 'Address query parameter is required' });
    }
  
    try {
      const response = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`, {
        params: {
          access_token: MAPBOX_ACCESS_TOKEN,
        },
      });
  
      const { features } = response.data;
      if (features.length === 0) {
        return res.status(404).json({ error: 'No results found' });
      }
  
      const [longitude, latitude] = features[0].center;
      res.json({ latitude, longitude });
    } catch (error) {
      console.error('Error fetching geocoding data:', error);
      res.status(500).json({ error: 'Failed to fetch geocoding data' });
    }
  };

  module.exports = {
    addLocation,
fetchLocations,
fetchGeoLocation,
  }
  