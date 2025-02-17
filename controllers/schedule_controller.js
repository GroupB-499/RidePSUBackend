const { db } = require('../firebase');
const Schedule = require("../models/schedule_model");

const isValidTime = (time) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour >= 8 && hour < 18;
};

const getSchedules = async (req, res) => {
  try {
    const snapshot = await db.collection("schedules").get();
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
    const doc = await db.collection("schedules").doc(id).get();
    if (!doc.exists) {
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
        .get();
  
      const conflictingSchedule = schedulesSnapshot.docs.find((doc) => {
        const schedule = doc.data();
        return isOverlapping(time,transportType,schedule.transportType, schedule.time,);
      });
  
      if (conflictingSchedule) {
        return res.status(400).json({ error: "Time slot already booked for this transport type." });
      }
  
      const newSchedule = { time, pickupLocations, dropoffLocations, transportType };
      const docRef = await db.collection("schedules").add(newSchedule);
  
      res.status(201).json({ message: "Schedule added successfully!", id: docRef.id, ...newSchedule });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  const isOverlapping = (time, transportType, existingTransportType, oldtime) => {
    return !(time !== oldtime || transportType !== existingTransportType);
  };
  
  
  
  

const updateSchedule = async (req, res) => {
  const { id } = req.params;
  const { time, endTime, pickupLocations, dropoffLocations, transportType } = req.body;

  try {
    const scheduleRef = db.collection("schedules").doc(id);
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
      return res.status(404).json({ error: "Schedule not found." });
    }

    if (time && !isValidTime(time) || endTime && !isValidTime(endTime)) {
      return res.status(400).json({ error: "Schedule timings must be between 8:00 AM and 6:00 PM." });
    }

    const updatedData = {};
    if (time) updatedData.time = time;
    if (endTime) updatedData.endTime = endTime;
    if (pickupLocations) updatedData.pickupLocations = pickupLocations;
    if (dropoffLocations) updatedData.dropoffLocations = dropoffLocations;
    if (transportType) {
      if (!["golf car", "shuttle bus"].includes(transportType.toLowerCase())) {
        return res.status(400).json({ error: "Invalid transport type. Must be 'golf car' or 'shuttle bus'." });
      }
      updatedData.transportType = transportType;
    }

    await scheduleRef.update(updatedData);
    res.status(200).json({ message: "Schedule updated successfully!", id, ...updatedData });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteSchedule = async (req, res) => {
  const { id } = req.params;

  try {
    const scheduleRef = db.collection("schedules").doc(id);
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
      return res.status(404).json({ error: "Schedule not found." });
    }

    await scheduleRef.delete();
    res.status(200).json({ message: "Schedule deleted successfully!" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getSchedules,
  getScheduleById,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  addDriver,
  getSchedulesByDriverId
};
