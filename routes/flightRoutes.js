const express = require('express');
const router = express.Router();
const Flight = require('../models/Flight');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const { sendEmail } = require('../utils/emailServices');
const { sendTicketConfirmation } = require('../utils/emailServices'); // Add this import

// Search flights
router.get('/search', async (req, res) => {
  try {
    const { from, to, date } = req.query;
    console.log('Search date:', date);

    const searchDate = new Date(date);
    const endDate = new Date(searchDate);
    endDate.setHours(23, 59, 59, 999);

    console.log('Search date range:', {
      searchDate,
      endDate
    });

    const flights = await Flight.find({
      from,
      to,
      departureTime: {
        $gte: searchDate,
        $lte: endDate
      }
    }).populate('airplane');

    console.log(`Found ${flights.length} flights for date ${searchDate}`);
    res.json(flights);
  } catch (error) {
    console.error('Flight search error:', error);
    res.status(500).json({ 
      message: 'Error searching flights',
      error: error.message 
    });
  }router.get('/return-flights', async (req, res) => {
    try {
      const { fromCity, toCity, departureDate } = req.query;
      
      if (!fromCity || !toCity || !departureDate) {
        return res.status(400).json({ message: 'Missing required parameters' });
      }
  
      const returnFlights = await Flight.findReturnFlights(fromCity, toCity, departureDate);
      
      const availableDates = returnFlights.map(flight => ({
        date: flight.departureTime,
        flightId: flight._id,
        availableSeats: flight.availableSeats
      }));
  
      res.json(availableDates);
    } catch (error) {
      console.error('Error fetching return flights:', error);
      res.status(500).json({ message: 'Error fetching return flights' });
    }
  });
});

// Get specific flight
router.get('/:id', auth, async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.id).populate('airplane');
    if (!flight) {
      return res.status(404).json({ message: 'Flight not found' });
    }
    res.json(flight);
  } catch (error) {
    console.error('Error fetching flight:', error);
    res.status(500).json({ 
      message: 'Error fetching flight details',
      error: error.message 
    });
  }
});

// Book a flight
router.post('/book', auth, async (req, res) => {
  try {
    const { flightId, seatClass, passengers, totalAmount } = req.body;
    
    // Validate flight exists
    const flight = await Flight.findById(flightId).populate('airplane');
    if (!flight) {
      return res.status(404).json({ message: 'Flight not found' });
    }

    // Check seat availability
    const availableSeats = seatClass === 'firstClass' 
      ? flight.firstClassSeats 
      : flight.economySeats;

    if (availableSeats < passengers) {
      return res.status(400).json({ 
        message: `Not enough ${seatClass} seats available` 
      });
    }

    // Generate ticket number
    const ticketNumber = `LEJET-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(-4).toUpperCase()}`;

    // Create booking
    const booking = new Booking({
      user: req.user.id,
      flight: flightId,
      seatClass,
      passengers,
      totalAmount,
      ticketNumber,
      status: 'pending'
    });

    const savedBooking = await booking.save();

    // Update flight seats
    if (seatClass === 'firstClass') {
      flight.firstClassSeats -= passengers;
    } else {
      flight.economySeats -= passengers;
    }
    await flight.save();

    // Send confirmation email
    const emailHtml = `
      <h1>Booking Confirmation</h1>
      <p>Dear ${req.user.name},</p>
      <p>Your flight has been successfully booked. Here are the details:</p>
      <ul>
        <li>Ticket Number: ${ticketNumber}</li>
        <li>Flight: ${flight.flightNumber}</li>
        <li>From: ${flight.from}</li>
        <li>To: ${flight.to}</li>
        <li>Departure: ${new Date(flight.departureTime).toLocaleString()}</li>
        <li>Seat Class: ${seatClass}</li>
        <li>Passengers: ${passengers}</li>
        <li>Total Amount: GH₵${totalAmount}</li>
      </ul>
      <p>Please complete your payment to confirm your booking.</p>
      <p>Thank you for choosing LEJET Airline!</p>
    `;

    await sendEmail(req.user.email, 'Booking Confirmation - LEJET Airline', emailHtml);

    res.status(201).json({ 
      message: 'Flight booked successfully',
      booking: {
        id: savedBooking._id,
        ticketNumber,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error booking flight:', error);
    res.status(500).json({ 
      message: 'Error booking flight',
      error: error.message 
    });
  }
});

// Confirm payment
router.post('/confirm-payment', auth, async (req, res) => {
  try {
    const { bookingId, paymentMethod, paymentDetails } = req.body;
    
    // Find booking and populate all necessary fields
    const booking = await Booking.findById(bookingId)
      .populate('user')
      .populate({
        path: 'flight',
        populate: {
          path: 'airplane'
        }
      });
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify ownership
    if (booking.user._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Update booking
    booking.status = 'confirmed';
    booking.paymentMethod = paymentMethod;
    booking.paymentDate = new Date();
    booking.ticketNumber = `LJ${Date.now().toString().slice(-6)}`;
    
    await booking.save();

    // Send email confirmation
    try {
      console.log('Attempting to send ticket confirmation email to:', booking.user.email);
      await sendTicketConfirmation(booking);
      console.log('Ticket confirmation email sent successfully');
    } catch (emailError) {
      console.error('Error sending ticket confirmation email:', emailError);
      // Continue with the process even if email fails
    }

    // Return success response
    res.json({
      message: 'Payment confirmed successfully',
      booking: booking.toObject()
    });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ 
      message: 'Error confirming payment',
      error: error.message 
    });
  }
});

// Get user bookings
router.get('/bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('flight')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ 
      message: 'Error fetching bookings',
      error: error.message 
    });
  }
});

// Update booking
router.put('/bookings/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { seatClass, passengers } = req.body;

    const booking = await Booking.findOne({ _id: id, user: req.user.id });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status === 'confirmed') {
      return res.status(400).json({ 
        message: 'Cannot modify confirmed booking' 
      });
    }

    // Update booking details
    booking.seatClass = seatClass || booking.seatClass;
    booking.passengers = passengers || booking.passengers;
    await booking.save();

    res.json({
      message: 'Booking updated successfully',
      booking
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ 
      message: 'Error updating booking',
      error: error.message 
    });
  }
});

// Cancel booking
router.delete('/bookings/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findOne({ _id: id, user: req.user.id });
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking already cancelled' });
    }

    // Update flight seats
    const flight = await Flight.findById(booking.flight);
    if (booking.seatClass === 'firstClass') {
      flight.firstClassSeats += booking.passengers;
    } else {
      flight.economySeats += booking.passengers;
    }
    await flight.save();

    // Cancel booking
    booking.status = 'cancelled';
    await booking.save();

    // Send cancellation email
    const emailHtml = `
      <h1>Booking Cancellation</h1>
      <p>Dear ${req.user.name},</p>
      <p>Your booking has been cancelled. Here are the details:</p>
      <ul>
        <li>Ticket Number: ${booking.ticketNumber}</li>
        <li>Cancellation Date: ${new Date().toLocaleString()}</li>
      </ul>
      <p>If you paid for this booking, a refund will be processed within 5-7 business days.</p>
      <p>Thank you for choosing LEJET Airline!</p>
    `;

    await sendEmail(req.user.email, 'Booking Cancellation - LEJET Airline', emailHtml);

    res.json({ 
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ 
      message: 'Error cancelling booking',
      error: error.message 
    });
  }
});

module.exports = router;