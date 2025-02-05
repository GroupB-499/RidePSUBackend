const bcrypt = require('bcrypt');
const { auth, db } = require('../firebase');
const nodemailer = require("nodemailer");
const User = require('../models/user_model');

let otpStore = {};

const sendOtp = async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore[email] = { otp, expiresAt: Date.now() + 300000 };

  const mailOptions = {
    from: "alashaikhnoura2@gmail.com",
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is: ${otp}`,
  };
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "alashaikhnoura2@gmail.com",
      pass: "vjwn wjzl mnfq lsbi",
    },
  });

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) return res.status(500).json({ error: error.toString() });
    res.json({ message: "OTP sent successfully" });
  });
};

const verifyOtp = (req, res) => {
  const { email, otp } = req.body;

  if (!otpStore[email] || otpStore[email].expiresAt < Date.now()) {
    return res.status(400).json({ message: "OTP expired or invalid" });
  }

  if (otpStore[email].otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  delete otpStore[email];
  res.json({ message: "OTP verified successfully" });
};

const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: "Email and new password are required." });
  }

  try {
    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    if (!userRecord) {
      return res.status(404).json({ error: "User not found." });
    }

    // Update password in Firebase Authentication
    await auth.updateUser(userRecord.uid, { password: newPassword });

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in Firestore
    await db.collection("users").doc(userRecord.uid).update({
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({ message: "Password reset successfully!" });

  } catch (error) {
    console.error("Error resetting password:", error.message);
    res.status(500).json({ error: `Error resetting password ${error.message}` });
  }
};



const login = async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const userSnapshot = await db
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({ error: 'User not found. Please sign up first.' });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    const isPasswordValid = await bcrypt.compare(password, userData.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = await auth.createCustomToken(userData.userId);

    const user = new User(
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

const signup = async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !phone || !password || !role) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });
    const token = await auth.createCustomToken(userRecord.uid);


    const user = new User(userRecord.uid, name, email, phone, hashedPassword, role);

    await db.collection('users').doc(userRecord.uid).set(user.toFirestore());

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

  try {
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userData = userDoc.data();
    const updates = {};

    if (email && email !== userData.email) {
      await auth.updateUser(userId, { email });
      updates.email = email;
    }else if(email){
      updates.email = email;
    }
    

    if (name) {
      updates.name = name;
    }

    if (phone) {
      updates.phone = phone;
    }

    if (role) {
      updates.role = role;
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date().toISOString();
      await userDocRef.update(updates);
    }

    res.status(200).json({ message: 'User details updated successfully!' ,user: {
      userId: userId,
      name: updates.name,
      email: updates.email,
      role: updates.role,
      phone: updates.phone,
    },});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.sendOtp = sendOtp;
exports.signup = signup;
exports.login = login;
exports.verifyOtp = verifyOtp;
exports.resetPassword = resetPassword;
exports.editUser = editUser;