const express = require('express');
const http = require('http'); // Required to create an HTTP server
const WebSocket = require('ws');
const routes = require('./routes');
const { db,messaging } = require('./firebase');
const {FieldValue} = require('firebase-admin/firestore');

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
      driverLocation = { lat: data.lat, lng: data.lng, userId: data.userId,date: data.date, time: data.time };
      console.log("hello1");

      // Broadcast the driver's location to all connected passengers
      broadcast(driverLocation);
    }

    if (data.type === 'ride_started') {
      sendPushNotification( data.userId,'Ride Started', 'Your ride has begun.');
    }
    if (data.type === 'ride_ended') {
      sendPushNotification(data.userId,'Ride Ended', 'Your ride has been completed.');
    }
    if(data.type === 'ride_delayed'){
      
      sendPushNotification(data.userId,'Ride Delayed', 'Your ride has been delayed.');
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });

  ws.send(JSON.stringify({ message: 'Connected to WebSocket Server' }));
});

async function sendPushNotification( userId, title, body) {
  try {
    // Fetch all user tokens from Firestore
    const snapshot = await db.collection('fcmTokens').get();
    const tokens = [];

    snapshot.forEach((doc) => {
      if (doc.data().tokens) {
        tokens.push(...doc.data().tokens); // Collect all tokens
      }
    });

    if (tokens.length === 0) {
      console.log('No FCM tokens found.');
      return;
    }

    const message = {
      notification: { title, body },
      tokens,
    };


    // Send notification to all tokens
    const response = await messaging.sendEachForMulticast(message);
    console.log('Notifications sent successfully:', response);


    // Save notification history in Firestore
    await db.collection("notifications").add({
      userId,
      title,
      body,
      timestamp: FieldValue.serverTimestamp(),
    });

  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

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
