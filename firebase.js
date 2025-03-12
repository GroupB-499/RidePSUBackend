const admin = require("firebase-admin");
const serviceAccount = require("./ridepsu-8b9fc-firebase-adminsdk-fbsvc-06a5286b53.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();
const messaging = admin.messaging();

module.exports = { auth, db, messaging };
