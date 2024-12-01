const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/emailServices');

router.post('/', async (req, res) => {
  try {
    const { feedback } = req.body;
    
    // Send feedback to admin email
    await sendEmail(
      process.env.ADMIN_EMAIL,
      'New Feedback Received',
      `<h1>New Feedback</h1><p>${feedback}</p>`
    );

    res.status(200).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ message: 'Error submitting feedback' });
  }
});

module.exports = router;

