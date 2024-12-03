const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {sendEmail} = require("../utils/emailServices")

router.post('/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    console.log(`Email: ${email} || password: ${password} || role:${role}`)
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, role });
    await user.save();
    console.log(`User with email ${email} was registered successfully`)

    const emailHtml = `
  <h1>Welcome to LEJET Airline!</h1>
  <p>Thank you for signing up with us! We are excited to have you as part of our community.</p>
  <p>Your account has been successfully created. You can now start exploring and booking your flights with ease. Here are your account details:</p>
  <ul>
    <li>Email: ${email}</li>
    <li>Account Created: ${new Date().toLocaleString().split("T")[0]}</li>
  </ul>
  <p>If you have any questions or need assistance, feel free to reach out to our support team. We're here to help!</p>
  <p>Thank you for choosing LEJET Airline!</p>
  <p>Best regards,<br>The LEJET Team</p>
`;

    await sendEmail(email,"Welcome to LEJET Airline!",emailHtml)

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Error registering user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create token with userId
    const token = jwt.sign(
      { 
        userId: user._id.toString() // Ensure it's a string
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Generated token for user:', {
      userId: user._id,
      email: user.email
    });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

module.exports = router;