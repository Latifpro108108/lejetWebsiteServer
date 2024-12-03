require('dotenv').config();
const express = require('express');
const connectDB = require("./config/db")
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const flightRoutes = require('./routes/flightRoutes');
const adminRoutes = require('./routes/adminRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    body: req.body,
    auth: req.headers.authorization
  });
  next();
});

// MongoDB connection

connectDB()


// Routes
app.use('/api/users', userRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/bookings', bookingRoutes);

// Error handling

app.get("/",(req,res)=>{
    res.send("ITS ALIVE")
})

app.listen(PORT, ()=>{
    console.log(`Server running on http://localhost:${PORT} `)
})