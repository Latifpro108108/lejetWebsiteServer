const express = require('express');
const router = express.Router();
const Flight = require('../models/Flight');
const Airplane = require('../models/Airplane');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Get all airplanes
router.get('/airplanes', auth, adminAuth, async (req, res) => {
  try {
    const airplanes = await Airplane.find().sort({ name: 1 });
    res.json(airplanes);
  } catch (error) {
    console.error('Error fetching airplanes:', error);
    res.status(500).json({ message: 'Error fetching airplanes' });
  }
});

// Add new airplane
router.post('/airplanes', auth, adminAuth, async (req, res) => {
  try {
    const { name, capacity, currentLocation } = req.body;
    
    const airplane = new Airplane({
      name,
      capacity: parseInt(capacity),
      currentLocation
    });

    await airplane.save();
    res.status(201).json(airplane);
  } catch (error) {
    console.error('Error adding airplane:', error);
    res.status(500).json({ message: 'Error adding airplane' });
  }
});

// Get all flights
router.get('/flights', auth, adminAuth, async (req, res) => {
  try {
    const flights = await Flight.find()
      .populate('airplane')
      .sort({ departureTime: 1 });
    res.json(flights);
  } catch (error) {
    console.error('Error fetching flights:', error);
    res.status(500).json({ message: 'Error fetching flights' });
  }
});

// Add new flight
router.post('/flights', auth, adminAuth, async (req, res) => {
  console.log('Received flight creation request');
  try {
    const {
      airplaneId,
      from,
      to,
      departureTime,
      arrivalTime,
      economyPrice,
      firstClassPrice,
      isRecurring,
      recurringDays,
      startDate,
      endDate
    } = req.body;

    console.log('Processing flight data:', req.body);

    const airplane = await Airplane.findById(airplaneId);
    if (!airplane) {
      return res.status(404).json({ message: 'Airplane not found' });
    }

    const totalSeats = airplane.capacity;
    const firstClassSeats = Math.floor(totalSeats * 0.2);
    const economySeats = totalSeats - firstClassSeats;

    if (isRecurring) {
      if (!startDate || !endDate || !recurringDays || recurringDays.length === 0) {
        return res.status(400).json({ message: 'Missing recurring flight details' });
      }

      try {
        const flights = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        const [departureHours, departureMinutes] = departureTime.split(':');
        const [arrivalHours, arrivalMinutes] = arrivalTime.split(':');

        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
          const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' });
          
          if (recurringDays.includes(dayOfWeek)) {
            const departureDateTime = new Date(date);
            departureDateTime.setHours(parseInt(departureHours), parseInt(departureMinutes));

            const arrivalDateTime = new Date(date);
            arrivalDateTime.setHours(parseInt(arrivalHours), parseInt(arrivalMinutes));

            if (arrivalDateTime < departureDateTime) {
              arrivalDateTime.setDate(arrivalDateTime.getDate() + 1);
            }

            const flight = new Flight({
              airplane: airplaneId,
              from,
              to,
              departureTime: departureDateTime,
              arrivalTime: arrivalDateTime,
              economyPrice: parseFloat(economyPrice),
              firstClassPrice: parseFloat(firstClassPrice),
              availableSeats: {
                economy: economySeats,
                firstClass: firstClassSeats
              },
              isRecurring: true,
              recurringDays,
              recurringEndDate: end,
              status: 'scheduled'
            });

            flights.push(flight);
          }
        }

        await Flight.insertMany(flights);
        res.status(201).json(flights);
      } catch (error) {
        console.error('Error creating recurring flights:', error);
        return res.status(400).json({ message: 'Error creating recurring flights' });
      }
    } else {
      console.log('Creating single flight');
      const flight = new Flight({
        airplane: airplaneId,
        from,
        to,
        departureTime: new Date(departureTime),
        arrivalTime: new Date(arrivalTime),
        economyPrice: parseFloat(economyPrice),
        firstClassPrice: parseFloat(firstClassPrice),
        availableSeats: {
          economy: economySeats,
          firstClass: firstClassSeats
        },
        status: 'scheduled'
      });

      console.log('Flight object before save:', flight);
      await flight.save();
      console.log('Flight saved successfully');
      res.status(201).json(flight);
    }
  } catch (error) {
    console.error('Error adding flight:', error);
    res.status(500).json({ 
      message: 'Error adding flight',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update flight status
router.patch('/flights/:id/status', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const flight = await Flight.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('airplane');

    if (!flight) {
      return res.status(404).json({ message: 'Flight not found' });
    }

    res.json(flight);
  } catch (error) {
    console.error('Error updating flight status:', error);
    res.status(500).json({ message: 'Error updating flight status' });
  }
});

module.exports = router;