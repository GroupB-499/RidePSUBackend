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
            reply: false, // Default value
            timestamp: FieldValue.serverTimestamp(),
        };

        await db.collection('ratings').add(ratingData);

        res.status(200).json({ message: "Rating submitted successfully!" });
    } catch (error) {
        console.error("Error submitting rating:", error);
        res.status(500).json({ error: "Failed to submit rating" });
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

exports.submitRatings = submitRatings;
exports.getRatings = getRatings;
exports.getMyRatings = getMyRatings;