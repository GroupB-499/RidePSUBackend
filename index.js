const express = require('express');
const http = require('http'); // Required to create an HTTP server
const WebSocket = require('ws');
const routes = require('./routes');
const { db, messaging } = require('./firebase');
const { FieldValue } = require('firebase-admin/firestore');
const cron = require("node-cron");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// CORS Middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, PUT');

  next();
});

// Attach API routes
app.use('/api', routes);

// Create an HTTP server instance
const server = http.createServer(app);

// Initialize WebSocket Server
const wss = new WebSocket.Server({ server });

let driverLocation = null; // Store latest driver location

wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log("hello");
    // If a driver sends a location update
    if (data.type === 'driver_location') {
      driverLocation = { lat: data.lat, lng: data.lng, userId: data.userId, date: data.date, time: data.time };
      console.log("hello1");

      // Broadcast the driver's location to all connected passengers
      broadcast(driverLocation);
    }

    if (data.type === 'ride_started') {
      sendPushNotification(data.userId, data.scheduleId, 'Ride Started', 'Your ride has begun.');
    }
    if (data.type === 'ride_ended') {
      sendPushNotification(data.userId, data.scheduleId, 'Ride Ended', 'Your ride has been completed.');
    }
    if (data.type === 'ride_delayed') {
      sendPushNotification(data.userId, data.scheduleId, 'Ride Delayed', 'Your ride has been delayed.');
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });

  ws.send(JSON.stringify({ message: 'Connected to WebSocket Server' }));
});

async function sendPushNotification(userId, scheduleId, title, body) {
  try {
    // Fetch all user tokens from Firestore
    const snapshot = await db.collection('fcmTokens').get();
    const tokensSet = new Set();

snapshot.forEach((doc) => {
  const docTokens = doc.data().tokens;
  if (docTokens) {
    docTokens.forEach((token) => tokensSet.add(token)); // Add unique tokens
  }
});

const tokens = Array.from(tokensSet); // Convert Set to an array

if (tokens.length === 0) {
  console.log('No FCM tokens found.');
} else {
  console.log('Unique FCM Tokens:', tokens);
}

    const message = {
      notification: { title, body },
      tokens,
    };


    // Send notification to all tokens
    const response = await messaging.sendEachForMulticast(message);
    console.log('Notifications sent successfully:', response);

if(scheduleId != null){
  
    const bookingsSnapshot = await db
      .collection("bookings")
      .where("scheduleId", "==", scheduleId)
      .get();

    
      const userIds = new Set();
    bookingsSnapshot.forEach((doc) => {
      const booking = doc.data();
      
        userIds.add(booking.userId);
      
    });

    if (userIds.size === 0) {
      console.log("No users found for notifications.");
      return;
    } // Fetch all FCM tokens for the selected user IDs

    Array.from(userIds).map(async(userId)=>{
      await db.collection("notifications").add({
        userId,
        title,
        body,
        timestamp: FieldValue.serverTimestamp(),
      });
    })
      
      
}
if(userId != null){
  await db.collection("notifications").add({
    userId,
    title,
    body,
    timestamp: FieldValue.serverTimestamp(),
  });
}

    // Save notification history in Firestore
    

  } catch (error) {
    console.error('Error sending notification:', error);
  }
}


cron.schedule("* * * * *", async () => {
  console.log("Running notification scheduler...");

  const now = new Date();
  now.setMinutes(now.getMinutes() + 10); // Add 10 minutes

  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  // Convert time to match Firestore format (e.g., "08:10")
  const currentTimeString = `${String(currentHour).padStart(2, "0")}:${String(
    currentMinutes
  ).padStart(2, "0")}`;

  console.log(currentTimeString);

  // Fetch schedules that match the current time
  try {
    const schedulesSnapshot = await db
      .collection("schedules")
      .where("time", "==", "08:10")
      .get();

    if (schedulesSnapshot.empty) {
      console.log("No schedules found for the current time.");
      return;
    }

    // Extract schedule IDs
    const scheduleIds = schedulesSnapshot.docs.map((doc) => doc.id);

    console.log("schedule ids: " + scheduleIds);

    // Fetch bookings that have today's date and one of the schedule IDs
    
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: "Asia/Riyadh" };
    const today = now.toLocaleDateString('en-CA', options); // YYYY-MM-DD
    console.log(today);
    const bookingsSnapshot = await db
      .collection("bookings")
      .where("date", "==", today) // Date filter
      .get();

    const userIds = new Set();
    bookingsSnapshot.forEach((doc) => {
      const booking = doc.data();
      console.log("bookings" + booking.scheduleId)
      if (scheduleIds.includes(booking.scheduleId)) {
        userIds.add(booking.userId);
      }
    });

    if (userIds.size === 0) {
      console.log("No users found for notifications.");
      return;
    } // Fetch all FCM tokens for the selected user IDs
    let tokens = [];
    const tokenPromises = Array.from(userIds).map(async (userId) => {
      const fcmSnapshot = await db
        .collection("fcmTokens")
        .where("userId", "==", userId)
        .get();

      fcmSnapshot.forEach((doc) => {
        const tokenData = doc.data();
        if (Array.isArray(tokenData.tokens)) {
          tokens = tokens.concat(tokenData.tokens); // Merge all tokens into one array
        }
      });
    });

    await Promise.all(tokenPromises);

    if (tokens.length === 0) {
      console.log("No valid FCM tokens found.");
      return;
    }

    // Send notifications
    const message = {
      notification: {
        title: "Upcoming Booking Reminder",
        body: "Your ride is scheduled in 10 minutes.",
      },
      tokens: tokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    userIds.forEach(async (uid) =>
      await db.collection("notifications").add({
        userId: uid,
        title: message.notification.title,
        body: message.notification.body,
        timestamp: FieldValue.serverTimestamp(),
      })
    );


    console.log("Notification sent successfully:", response);
    // Delete previous reminders (older than 10 minutes)
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

    const oldRemindersSnapshot = await db.collection("notifications").get();
    const deletePromises = [];

    oldRemindersSnapshot.forEach((doc) => {
      const notificationData = doc.data();
      if (notificationData.timestamp) {
        const notificationTime = new Date(notificationData.timestamp.toDate()); // Convert Firestore timestamp to Date

        if (notificationTime < tenMinutesAgo) {
          deletePromises.push(db.collection("notifications").doc(doc.id).delete());
        }
      }
    });

    await Promise.all(deletePromises);
    console.log(`${deletePromises.length} old notifications deleted.`);

  } catch (error) {
    console.error("Error in notification cron job:", error);
  }
});

// Function to broadcast messages to all clients
function broadcast(data) {
  console.log("hello2");

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Start both HTTP and WebSocket server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
