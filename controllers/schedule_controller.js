// This file contains controller functions for managing schedules, including adding, updating,
// and deleting schedules in a transportation system.

const { db } = require('../firebase'); // Importing the database connection
const Schedule = require("../models/schedule_model"); // Importing the Schedule model

const isValidTime = (time) => { // Function to check if time is valid
  const [hour, minute] = time.split(":").map(Number); //splits the time string by : and converts the resulting parts to numbers to get the hour and minute.
  return hour >= 8 && hour < 18;
};

const getSchedules = async (req, res) => { // Get all schedules, function named getSchedules that takes the request and response
  try {
    const snapshot = await db.collection("schedules").get(); //fetches all schedules from the Firestore database.
    const schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const getSchedulesByDriverId = async (req, res) => {
  try {
    const { driverId } = req.query;
    let query = db.collection('schedules');

    if (driverId) {
        query = query.where('driverId', '==', driverId);
    }

    const snapshot = await query.get();
    const schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(schedules);
} catch (error) {
    res.status(500).json({ error: error.message });
}
};


const getScheduleById = async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await db.collection("schedules").doc(id).get(); //retrieves a specific schedule document from the Firestore database based on the provided id.
    if (!doc.exists) { //checks if the retrieved document exists in the database.
      return res.status(404).json({ error: "Schedule not found." });
    }
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Assign driver to routes based on conditions
// Just a helper function for adding driver Id to multiple schedules at once
const addDriver= async (req, res) => {
  try {
      const { driverId, startTimeFrom, startTimeTo, transportType } = req.body;

      if (!driverId || !startTimeFrom || !startTimeTo || !transportType) {
          return res.status(400).json({ message: 'Missing required fields' });
      }

      const schedulesRef = db.collection('schedules');
      const querySnapshot = await schedulesRef
          .where('time', '>=', startTimeFrom)
          .where('time', '<=', startTimeTo)
          .where('transportType', '==', transportType)
          .get();

      if (querySnapshot.empty) {
          return res.status(404).json({ message: 'No schedules found' });
      }
      const updatePromises = [];
      querySnapshot.forEach((doc) => {
          const scheduleRef = schedulesRef.doc(doc.id);
          updatePromises.push(scheduleRef.update({ driverId }));
      });

      await Promise.all(updatePromises);
      res.status(200).json({ message: 'Driver assigned successfully' });
  } catch (error) {
      console.error('Error assigning driver:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
};


const addSchedule = async (req, res) => {
    const { time, pickupLocations, dropoffLocations, transportType } = req.body;
  
    if (!time || !pickupLocations?.length || !dropoffLocations?.length || !transportType) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (!isValidTime(time)) {
      return res.status(400).json({ error: "Schedule timings must be between 8:00 AM and 6:00 PM." });
    }
    if (!["golf car", "shuttle bus"].includes(transportType.toLowerCase())) {
      return res.status(400).json({ error: "Invalid transport type. Must be 'golf car' or 'shuttle bus'." });
    }
  
    try {
      const schedulesSnapshot = await db
        .collection("schedules")
        .where("transportType", "==", transportType)
        .get(); // Retrieve schedules with the same transport type
  
      const conflictingSchedule = schedulesSnapshot.docs.find((doc) => { // Find conflicting schedules
        const schedule = doc.data(); // Get schedule data from the document
        return isOverlapping(time,transportType,schedule.transportType, schedule.time,); // Check for overlapping schedules
      });
  
      if (conflictingSchedule) { // If there is a conflicting schedule
        return res.status(400).json({ error: "Time slot already booked for this transport type." });
      }
  
      const newSchedule = { time, pickupLocations, dropoffLocations, transportType }; // Create a new schedule object
      const docRef = await db.collection("schedules").add(newSchedule); // Add the new schedule to the database
  
      res.status(201).json({ message: "Schedule added successfully!", id: docRef.id, ...newSchedule }); // Send a success response with the new schedule details
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  const isOverlapping = (time, transportType, existingTransportType, oldtime) => { // Function to check if schedules are overlapping
    return !(time !== oldtime || transportType !== existingTransportType);
  };
  
  
  
  

const updateSchedule = async (req, res) => { // Update a schedule, Function to update a schedule
  const { id } = req.params; // Extract the schedule ID from the request parameters
  const { time, endTime, pickupLocations, dropoffLocations, transportType } = req.body; // Extract schedule update data from the request body

  try {
    const scheduleRef = db.collection("schedules").doc(id); // Get a reference to the schedule document
    const scheduleDoc = await scheduleRef.get(); // Retrieve the schedule document

    if (!scheduleDoc.exists) { // If the schedule document does not exist
      return res.status(404).json({ error: "Schedule not found." });
    }

    if (time && !isValidTime(time) || endTime && !isValidTime(endTime)) { // Check if the updated timings are valid
      return res.status(400).json({ error: "Schedule timings must be between 8:00 AM and 6:00 PM." });
    }

    const updatedData = {}; // Initialize an object to store updated schedule data
    if (time) updatedData.time = time; // Update the schedule time if provided
    if (endTime) updatedData.endTime = endTime;
    if (pickupLocations) updatedData.pickupLocations = pickupLocations; // Update pickup locations if provided
    if (dropoffLocations) updatedData.dropoffLocations = dropoffLocations; // Update dropoff locations if provided
    if (transportType) { // If transport type is provided
      if (!["golf car", "shuttle bus"].includes(transportType.toLowerCase())) { // Check if the transport type is valid
        return res.status(400).json({ error: "Invalid transport type. Must be 'golf car' or 'shuttle bus'." });
      }
      updatedData.transportType = transportType; // Update the transport type
    }

    await scheduleRef.update(updatedData); // Update the schedule document with the new data
    res.status(200).json({ message: "Schedule updated successfully!", id, ...updatedData }); // Send a success response with the updated schedule details

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteSchedule = async (req, res) => { // Delete a schedule, Function to delete a schedule
  const { id } = req.params; // Extract the schedule ID from the request parameters

  try {
    const scheduleRef = db.collection("schedules").doc(id); // Get a reference to the schedule document
    const scheduleDoc = await scheduleRef.get(); // Retrieve the schedule document

    if (!scheduleDoc.exists) { // If the schedule document does not exist
      return res.status(404).json({ error: "Schedule not found." });
    }

    await scheduleRef.delete();
    res.status(200).json({ message: "Schedule deleted successfully!" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { // Exporting the controller functions
  getSchedules,
  getScheduleById,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  addDriver,
  getSchedulesByDriverId
};
