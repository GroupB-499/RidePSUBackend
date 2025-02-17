// this file contains functions related to user authentication, such as sending OTP, verifying OTP, resetting passwords,
// user login, user signup, and editing user details

// Import necessary modules
const bcrypt = require('bcrypt'); //This line imports the bcrypt module, which is commonly used for password hashing in Node.js applications.
const { auth, db } = require('../firebase'); //This line imports the auth and db objects from a file named firebase
const nodemailer = require("nodemailer"); //This line imports the nodemailer module, which is a library for sending emails from Node.js applications
const User = require('../models/user_model'); //This line imports the User model from a file named user_model

let otpStore = {}; // Object to store OTPs generated for users

// Function to send OTP to the user's email
const sendOtp = async (req, res) => { //function named sendOtp that takes req (request) and res (response)
  const { email } = req.body; //extract the email field from the request body
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); //generates a random 6-digit OTP (One-Time Password) and converts it to a string.

      // Store OTP along with expiration time
    otpStore[email] = { otp, expiresAt: Date.now() + 300000 }; //stores the generated OTP along with its expiration time (5 minutes from the current time) in the otpStore object using the email as the key

    //Email configuration for sending OTP
  const mailOptions = { //object mailOptions that will contain the configuration for sending the OTP email.
    from: "alashaikhnoura2@gmail.com",
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is: ${otp}`,
  };

  // Nodemailer transporter to send the email
  const transporter = nodemailer.createTransport({ //creates a nodemailer transporter object using the Gmail service for sending emails.
    service: "gmail",
    auth: {
      user: "alashaikhnoura2@gmail.com",
      pass: "vjwn wjzl mnfq lsbi",
    },
  });

  // Send the email with OTP
  transporter.sendMail(mailOptions, (error, info) => {//sends the email with the OTP using the transporter object and handles any errors that may occur during the sending process.
    if (error) return res.status(500).json({ error: error.toString() }); //checks if an error occurred while sending the email. If an error exists, it immediately sends a 500 status response with the error message.
    res.json({ message: "OTP sent successfully" });//sends a JSON response indicating that the OTP was sent successfully.
  });
};

// Function to verify the OTP entered by the user
const verifyOtp = (req, res) => {// function named verifyOtp that takes req (request) and res (response)
  const { email, otp } = req.body; //extract the email and otp fields from the request body

      // Check if OTP exists and is valid
  if (!otpStore[email] || otpStore[email].expiresAt < Date.now()) { //checks if the stored OTP for the provided email does not exist or if it has expired based on the expiresAt timestamp
    return res.status(400).json({ message: "OTP expired or invalid" });//sends a 400 status response with a message indicating that the OTP has expired or is invalid.
  }

  if (otpStore[email].otp !== otp) { //checks if the OTP entered by the user does not match the stored OTP for the provided email.
    return res.status(400).json({ message: "Invalid OTP" }); //sends a 400 status response with a message indicating that the entered OTP is invalid.
  }

      // Delete OTP after verification
  delete otpStore[email]; //deletes the OTP for the provided email from the otpStore object after successful verification.
  res.json({ message: "OTP verified successfully" });
};

// Function to reset user password
const resetPassword = async (req, res) => { //function named resetPassword that takes req (request) and res (response)
  const { email, newPassword } = req.body; //extracts the email and newPassword fields from the request body.

  if (!email || !newPassword) { //checks if the email or newPassword fields are missing in the request body
    return res.status(400).json({ error: "Email and new password are required." }); //sends a 400 status response with an error message if the email or newPassword fields are missing.
  }

  try {
    // Get user by email
    const userRecord = await auth.getUserByEmail(email); //fetches the user record using the provided email from Firebase Authentication.
    if (!userRecord) { //checks if the user record does not exist based on the provided email.
      return res.status(404).json({ error: "User not found." }); //sends a 404 status response with an error message if the user is not found.
    }

    // Update password in Firebase Authentication
    await auth.updateUser(userRecord.uid, { password: newPassword }); //updates the user's password in Firebase Authentication to the new password.

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10); //hashes the new password using bcrypt with a cost factor of 10 for stronger security.

    // Update password in Firestore
    await db.collection("users").doc(userRecord.uid).update({ //updates the user's password and updatedAt field in the Firestore database.
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({ message: "Password reset successfully!" });

  } catch (error) {
    console.error("Error resetting password:", error.message); // logs an error message to the console if there is an error resetting the password.
    res.status(500).json({ error: `Error resetting password ${error.message}` });
  }
};


// Function to handle user login
const login = async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
  if (!email || !password) { // checks if the email or password fields are missing in the request body.
    return res.status(400).json({ error: 'Email and password are required.' }); //sends a 400 status response with an error message if the email or password fields are missing.
  }

  try { //This line queries the Firestore database to retrieve user data based on the provided email.
    const userSnapshot = await db
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (userSnapshot.empty) { //checks if the userSnapshot is empty, indicating that no user with the provided email exists.
      return res.status(404).json({ error: 'User not found. Please sign up first.' }); //sends a 404 status response with an error message if the user is not found in the database.
    }

    //These lines extract the user data from the first document in the userSnapshot.
    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    const isPasswordValid = await bcrypt.compare(password, userData.password); //compares the password provided by the user with the hashed password stored in the database using bcrypt.

    if (!isPasswordValid) { //checks if the password provided by the user does not match the stored password.
      return res.status(401).json({ error: 'Invalid email or password.' }); //sends a 401 status response with an error message for invalid email or password.
    }

    const token = await auth.createCustomToken(userData.userId); //creates a custom authentication token for the user using Firebase Authentication.

    const user = new User( //creates a new User object with the user data retrieved from the database.
      userData.userId,
      userData.name,
      userData.email,
      userData.phone,
      userData.password,
      userData.role,
    );


    res.status(200).json({
      message: 'Login successful!',
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const signup = async (req, res) => { //function named signup that takes req (request) and res (response)
  const { name, email, phone, password, role } = req.body; //extracts the name, email, phone, and password fields from the request body

  if (!name || !email || !phone || !password || !role) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10); //hashes the user's password using bcrypt with a cost factor of 10 for secure storage in the database.

    const userRecord = await auth.createUser({ //creates a new user in Firebase Authentication with the provided email, password, and display name.
      email,
      password,
      displayName: name,
    });
    const token = await auth.createCustomToken(userRecord.uid);


    const user = new User(userRecord.uid, name, email, phone, hashedPassword, role); //creates a new User object with the user details including the user ID, name, email, phone, hashed password, and role.

    await db.collection('users').doc(userRecord.uid).set(user.toFirestore()); //stores the user data in the Firestore database after successful user creation in Firebase Authentication.

    res.status(201).json({ message: 'User signed up successfully!',user: {
      userId: userRecord.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
    },
    token, });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const editUser = async (req, res) => {
  const { userId, name, email, phone, role } = req.body;

  if (!userId || (!name && !email && !phone && !role)) {
    return res
      .status(400)
      .json({ error: 'User ID and at least one field to update are required.' });
  }

  try { //fetches the user document from the Firestore database based on the provided `userId`.
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userData = userDoc.data();
    const updates = {}; //initializes an empty object to store the fields that need to be updated.

    if (email && email !== userData.email) { // Update user email if provided and different
      await auth.updateUser(userId, { email });
      updates.email = email;
    }else if(email){
      updates.email = email;
    }
    

    if (name) { // Update user name if provided
      updates.name = name;
    }

    if (phone) { // Update user phone if provided
      updates.phone = phone;
    }

    if (role) { // Update user role if provided
      updates.role = role;
    }

    if (Object.keys(updates).length > 0) { // Check if there are updates to be made
      updates.updatedAt = new Date().toISOString();
      await userDocRef.update(updates); // Update user document with the collected updates
    }

    res.status(200).json({ message: 'User details updated successfully!' ,user: {
      userId: userId,
      name: updates.name,
      email: updates.email,
      role: updates.role,
      phone: updates.phone,
    },});
  } catch (error) {
    res.status(500).json({ error: error.message }); // Send error response if an error occurs during the update
  }
};

// Export the editUser function for use in other modules
exports.sendOtp = sendOtp;
exports.signup = signup;
exports.login = login;
exports.verifyOtp = verifyOtp;
exports.resetPassword = resetPassword;
exports.editUser = editUser;