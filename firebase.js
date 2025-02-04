const admin = require("firebase-admin");
const serviceAccount = require("./ridepsu-8b9fc-firebase-adminsdk-fbsvc-cba71b735d.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

module.exports = { auth, db };
