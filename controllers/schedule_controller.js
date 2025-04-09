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

const getNotificationsById = async (req, res) => {
  try {
    const { userId } = req.params;
    const snapshot = await db.collection("notifications")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "No notifications found." });
    }

    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ notifications });
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
const addDriver = async (req, res) => {
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

    const conflicts = [];
    const updatePromises = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // Check if the schedule already has a driver assigned
      if (data.driverId) {
        conflicts.push({ id: doc.id, time: data.time, assignedDriver: data.driverId });
      } else {
        const scheduleRef = schedulesRef.doc(doc.id);
        updatePromises.push(scheduleRef.update({ driverId }));
      }
    });

    if (conflicts.length > 0) {
      return res.status(409).json({
        message: 'Some schedules are already assigned to another driver',
        conflicts,
      });
    }

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
  
  
  const updateSchedule = async (req, res) => {
    const { id } = req.params;
    const { time, endTime, pickupLocations, dropoffLocations, transportType } = req.body;
  
    if (!time || !pickupLocations?.length || !dropoffLocations?.length || !transportType) {
      return res.status(400).json({ error: "All fields are required." });
    }
  
  
    try {
      const scheduleRef = db.collection("schedules").doc(id);
      const scheduleDoc = await scheduleRef.get();
  
      if (!scheduleDoc.exists) {
        return res.status(404).json({ error: "Schedule not found." });
      }
  
      // Check if an identical schedule (excluding this one) already exists
      const schedulesSnapshot = await db.collection("schedules").get();
  
      const duplicateSchedule = schedulesSnapshot.docs.find((doc) => {
        if (doc.id === id) return false; // Skip current being updated
  
        const schedule = doc.data();
  
        return (
          schedule.pickupLocations[0] === pickupLocations &&
          schedule.dropoffLocations[0] === dropoffLocations &&
          schedule.time === time &&
          schedule.transportType.toLowerCase() === transportType.toLowerCase()
        );
      });
  
      if (duplicateSchedule) {
        return res.status(400).json({ error: "A schedule with the same pickup, dropoff, time, and transport type already exists." });
      }
  
      // If no duplicate, perform update
      const updatedData = {
        time,
        pickupLocations: [pickupLocations],
        dropoffLocations: [dropoffLocations],
        transportType
      };
  
      if (endTime) updatedData.endTime = endTime;
  
      await scheduleRef.update(updatedData);
  
      res.status(200).json({ message: "Schedule updated successfully!", id, ...updatedData });
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
  getSchedulesByDriverId,
  getNotificationsById,
};
