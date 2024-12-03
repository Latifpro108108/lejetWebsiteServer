const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Flight = require('../models/Flight'); // Assuming you have a Flight model
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Logging route registration
console.log('Registering report routes...');

// Monthly Revenue and Flight Report Endpoint
router.get('/monthly-revenue', auth, adminAuth, async (req, res) => {
    console.log('Monthly revenue endpoint accessed');
    console.log('Received query params:', req.query);

    try {
        const { month, year } = req.query;

        // Validate input
        if (!month || !year) {
            return res.status(400).json({ message: 'Month and year are required' });
        }

        // Set date range
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        console.log('Querying date range:', { startDate, endDate });

        // Query for bookings
        const monthlyBookings = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    status: 'confirmed'
                }
            },
            {
                $lookup: {
                    from: 'flights',
                    localField: 'flight',
                    foreignField: '_id',
                    as: 'flightDetails'
                }
            },
            {
                $unwind: {
                    path: '$flightDetails',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' },
                    totalBookings: { $sum: 1 },
                    totalPassengers: { $sum: '$passengers' },
                    economyClassBookings: {
                        $sum: { $cond: [{ $eq: ['$seatClass', 'economy'] }, 1, 0] }
                    },
                    firstClassBookings: {
                        $sum: { $cond: [{ $eq: ['$seatClass', 'firstClass'] }, 1, 0] }
                    },
                    economyClassRevenue: {
                        $sum: { $cond: [{ $eq: ['$seatClass', 'economy'] }, '$totalAmount', 0] }
                    },
                    firstClassRevenue: {
                        $sum: { $cond: [{ $eq: ['$seatClass', 'firstClass'] }, '$totalAmount', 0] }
                    },
                    bookings: {
                        $push: {
                            ticketNumber: '$ticketNumber',
                            amount: '$totalAmount',
                            passengers: '$passengers',
                            seatClass: '$seatClass',
                            flightDetails: {
                                from: '$flightDetails.from',
                                to: '$flightDetails.to'
                            }
                        }
                    }
                }
            }
        ]);

        console.log('Booking aggregation results:', monthlyBookings);

        // Get the number of flights for the specified month and year
        const numberOfFlights = await Flight.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate }
        });

        console.log('Number of flights:', numberOfFlights);

        if (monthlyBookings.length === 0) {
            return res.json({
                totalRevenue: 0,
                totalBookings: 0,
                totalPassengers: 0,
                economyClassBookings: 0,
                firstClassBookings: 0,
                economyClassRevenue: 0,
                firstClassRevenue: 0,
                averageRevenuePerBooking: 0,
                numberOfFlights: 0,
                bookings: []
            });
        }

        const result = monthlyBookings[0];
        result.averageRevenuePerBooking = result.totalBookings > 0
            ? result.totalRevenue / result.totalBookings
            : 0;
        result.numberOfFlights = numberOfFlights;

        console.log('Final report data:', result);
        res.json(result);

    } catch (error) {
        console.error('Error generating monthly report:', error);
        res.status(500).json({ message: 'Error generating monthly report' });
    }
});

module.exports = router;
