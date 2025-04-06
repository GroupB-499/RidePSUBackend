const { db } = require('../firebase');
const { FieldValue } = require('firebase-admin/firestore');

const submitRatings = async (req, res) => {
  const { userId, username, rating, feedback } = req.body;

  if (!userId || !username || !rating) {
    return res.status(400).json({ error: "User ID, username and rating are required." });
  }

  try {
    const ratingData = {
      userId,
      username,
      rating,
      feedback: feedback || "",
      reply: "", // changed from boolean to string
      timestamp: FieldValue.serverTimestamp(),
    };

    await db.collection('ratings').add(ratingData);

    res.status(200).json({ message: "Rating submitted successfully!" });
  } catch (error) {
    console.error("Error submitting rating:", error);
    res.status(500).json({ error: "Failed to submit rating" });
  }
};


const submitComplaints = async (req, res) => {
  const { userId, username, feedback } = req.body;

  if (!userId || !username) {
    return res.status(400).json({ error: "User ID and username are required." });
  }

  try {
    const ratingData = {
      userId,
      username,
      feedback: feedback || "",
      reply: "", // changed from boolean to string
      timestamp: FieldValue.serverTimestamp(),
    };

    await db.collection('complaints').add(ratingData);

    res.status(200).json({ message: "Complaints submitted successfully!" });
  } catch (error) {
    console.error("Error submitting complaint:", error);
    res.status(500).json({ error: "Failed to submit complaint" });
  }
};


const replyToRating = async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;

  if (!reply || !reply.trim()) {
    return res.status(400).json({ error: "Reply content is required." });
  }

  try {
    const ratingRef = db.collection('ratings').doc(id);
    const ratingDoc = await ratingRef.get();

    if (!ratingDoc.exists) {
      return res.status(404).json({ error: "Rating not found." });
    }

    await ratingRef.update({ reply });

    res.status(200).json({ message: "Reply added successfully." });
  } catch (error) {
    console.error("Error replying to rating:", error);
    res.status(500).json({ error: "Failed to add reply." });
  }
};


const getRatings = async (req, res) => {
  try {
    const ratingsSnapshot = await db.collection('ratings')
      .orderBy('timestamp', 'desc') // Sorting by latest ratings first
      .get();

    if (ratingsSnapshot.empty) {
      return res.status(404).json({ message: "No ratings found." });
    }

    const ratings = ratingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ ratings });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    res.status(500).json({ error: "Failed to fetch ratings" });
  }
};

const getMyRatings = async (req, res) => {
  const { userId } = req.params; // Extract userId from query params

  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }

  try {
    const ratingsSnapshot = await db.collection('ratings')
      .where('userId', '==', userId) // Fetch ratings only for the specified user
      // .orderBy('timestamp', 'desc') // Sorting by latest ratings first
      .get();

    if (ratingsSnapshot.empty) {
      return res.status(404).json({ message: "No ratings found for this user." });
    }

    const ratings = ratingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ ratings });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    res.status(500).json({ error: "Failed to fetch ratings" });
  }
};


const replyToComplaint = async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;

  if (!reply || !reply.trim()) {
    return res.status(400).json({ error: "Reply content is required." });
  }

  try {
    const ratingRef = db.collection('complaints').doc(id);
    const ratingDoc = await ratingRef.get();

    if (!ratingDoc.exists) {
      return res.status(404).json({ error: "Complaint not found." });
    }

    await ratingRef.update({ reply });

    res.status(200).json({ message: "Reply added successfully." });
  } catch (error) {
    console.error("Error replying to complaint:", error);
    res.status(500).json({ error: "Failed to add reply." });
  }
};


const getComplaints = async (req, res) => {
  try {
    const ratingsSnapshot = await db.collection('complaints')
      .orderBy('timestamp', 'desc') // Sorting by latest ratings first
      .get();

    if (ratingsSnapshot.empty) {
      return res.status(404).json({ message: "No complaints found." });
    }

    const complaints = ratingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ complaints });
  } catch (error) {
    console.error("Error fetching complaints:", error);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
};

const getMyComplaints = async (req, res) => {
  const { userId } = req.params; // Extract userId from query params

  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }

  try {
    const ratingsSnapshot = await db.collection('complaints')
      .where('userId', '==', userId) // Fetch ratings only for the specified user
      // .orderBy('timestamp', 'desc') // Sorting by latest ratings first
      .get();

    if (ratingsSnapshot.empty) {
      return res.status(404).json({ message: "No complaints found for this user." });
    }

    const complaints = ratingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ complaints });
  } catch (error) {
    console.error("Error fetching complaints:", error);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
};


exports.submitRatings = submitRatings;
exports.getRatings = getRatings;
exports.getMyRatings = getMyRatings;
exports.replyToRating = replyToRating;

exports.submitComplaints = submitComplaints;
exports.getComplaints = getComplaints;
exports.getMyComplaints = getMyComplaints;
exports.replyToComplaint = replyToComplaint;
