import { db } from "../firebase";

const submitRatings = async (req, res) => {
    try {
        const { userId, username, rating, feedback } = req.body;

        if (!userId || !username || !rating) {
            return res.status(400).json({ error: "User ID, username and rating are required." });
        }

        const ratingData = {
            userId,
            username,
            rating,
            feedback: feedback || "",
            reply: false, // Default value
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('ratings').add(ratingData);

        res.status(200).json({ message: "Rating submitted successfully!" });
    } catch (error) {
        console.error("Error submitting rating:", error);
        res.status(500).json({ error: "Failed to submit rating" });
    }
};

exports.submitRatings = submitRatings;