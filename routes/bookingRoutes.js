const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const auth = require('../middleware/auth');
const { sendEmail, sendBookingConfirmation, sendTicketConfirmation } = require('../utils/emailServices');

// Create new booking
router.post('/', auth, async (req, res) => {
    try {
        const { 
            flightId, 
            returnFlightId,
            seatClass, 
            passengers, 
            outboundAmount,
            returnAmount,
            totalAmount,
            isRoundTrip 
        } = req.body;
        
        // Verify outbound flight exists and has enough seats
        const outboundFlight = await Flight.findById(flightId);
        if (!outboundFlight) {
            return res.status(404).json({ message: 'Outbound flight not found' });
        }

        if (outboundFlight.availableSeats[seatClass] < passengers) {
            return res.status(400).json({ message: 'Not enough seats available on outbound flight' });
        }

        // Create booking object
        const bookingData = {
            user: req.user.id,
            outboundFlight: flightId,
            seatClass,
            passengers,
            outboundAmount,
            totalAmount,
            departureDate: outboundFlight.departureTime,
            isRoundTrip,
            outboundTicketNumber: `LJ${Date.now().toString().slice(-6)}`
        };

        // If round trip, verify return flight
        if (isRoundTrip && returnFlightId) {
            const returnFlight = await Flight.findById(returnFlightId);
            if (!returnFlight) {
                return res.status(404).json({ message: 'Return flight not found' });
            }

            if (returnFlight.availableSeats[seatClass] < passengers) {
                return res.status(400).json({ message: 'Not enough seats available on return flight' });
            }

            bookingData.returnFlight = returnFlightId;
            bookingData.returnAmount = returnAmount;
            bookingData.returnDate = returnFlight.departureTime;
            bookingData.returnTicketNumber = `LJ${Date.now().toString().slice(-6)}R`;
        }

        const booking = new Booking(bookingData);
        await booking.save();

        // Update seats for outbound flight
        await Flight.findByIdAndUpdate(flightId, {
            $inc: {
                [`availableSeats.${seatClass}`]: -passengers
            }
        });

        // Update seats for return flight if round trip
        if (isRoundTrip && returnFlightId) {
            await Flight.findByIdAndUpdate(returnFlightId, {
                $inc: {
                    [`availableSeats.${seatClass}`]: -passengers
                }
            });
        }

        // Populate the saved booking
        const populatedBooking = await Booking.findById(booking._id)
            .populate('user', 'email name')
            .populate({
                path: 'outboundFlight',
                populate: {
                    path: 'airplane'
                }
            })
            .populate({
                path: 'returnFlight',
                populate: {
                    path: 'airplane'
                }
            });

        // Send booking confirmation email
        try {
            const emailSubject = `LEJET Airlines - Booking Confirmation #${booking._id}`;
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1>Booking Confirmation</h1>
                    <p>Dear ${populatedBooking.user.name},</p>
                    <p>Your booking has been confirmed. Details:</p>
                    <ul>
                        <li>Booking Reference: ${booking._id}</li>
                        <li>From: ${populatedBooking.outboundFlight.from}</li>
                        <li>To: ${populatedBooking.outboundFlight.to}</li>
                        <li>Date: ${new Date(populatedBooking.departureDate).toLocaleString()}</li>
                        <li>Class: ${populatedBooking.seatClass}</li>
                        <li>Passengers: ${populatedBooking.passengers}</li>
                        <li>Total Amount: GH₵${populatedBooking.totalAmount}</li>
                    </ul>
                    <p>Thank you for choosing LEJET Airlines!</p>
                </div>
            `;
            
            await sendEmail(populatedBooking.user.email, emailSubject, emailHtml);
        } catch (emailError) {
            console.error('Error sending booking confirmation:', emailError);
        }

        res.status(201).json({
            message: 'Booking created successfully',
            booking: populatedBooking
        });
    } catch (error) {
        console.error('Booking creation error:', error);
        res.status(500).json({ 
            message: 'Error creating booking',
            error: error.message 
        });
    }
});

// ... rest of the routes remain the same ...

// Get single booking
router.get('/:id', auth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('user', 'email name')
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
        if (booking.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(booking);
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ message: 'Error fetching booking details' });
    }
});

// Confirm payment
router.post('/confirm-payment', auth, async (req, res) => {
    try {
        const { bookingId, paymentMethod, paymentDetails } = req.body;

        const booking = await Booking.findById(bookingId)
            .populate('user', 'email name')
            .populate({
                path: 'flight',
                populate: {
                    path: 'airplane'
                }
            });

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        booking.status = 'confirmed';
        booking.paymentMethod = paymentMethod;
        booking.paymentDetails = paymentDetails;
        booking.paymentDate = new Date();

        await booking.save();

        // Send ticket confirmation email after payment
        try {
            await sendTicketConfirmation(booking);
        } catch (emailError) {
            console.error('Error sending ticket confirmation:', emailError);
        }

        res.json({
            message: 'Payment confirmed successfully',
            booking: booking
        });
    } catch (error) {
        console.error('Payment confirmation error:', error);
        res.status(500).json({ message: 'Error confirming payment' });
    }
});

// Get user's bookings
router.get('/user/bookings', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ 
            user: req.user.id,
            status: { $in: ['confirmed', 'cancelled'] }
        })
        .populate('user', 'email name')
        .populate({
            path: 'flight',
            populate: {
                path: 'airplane'
            }
        })
        .sort({ createdAt: -1 });

        res.json(bookings);
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

// Cancel booking
router.delete('/:id/cancel', auth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('flight');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const departureTime = new Date(booking.flight.departureTime);
        const now = new Date();
        const hoursDifference = (departureTime - now) / (1000 * 60 * 60);

        if (hoursDifference <= 1) {
            return res.status(400).json({ 
                message: 'Bookings can only be cancelled at least 1 hour before departure' 
            });
        }

        // Return seats to available inventory
        await Flight.findByIdAndUpdate(booking.flight._id, {
            $inc: {
                [`availableSeats.${booking.seatClass}`]: booking.passengers
            }
        });

        booking.status = 'cancelled';
        await booking.save();

        res.json({ 
            message: 'Booking cancelled successfully',
            booking: booking
        });
    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ message: 'Error cancelling booking' });
    }
});

module.exports = router;