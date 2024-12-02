const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    flight: {  // Changed from outboundFlight to match your route
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flight',
        required: true
    },
    ticketNumber: {  // Changed from outboundTicketNumber to match your route
        type: String,
        required: true,
        unique: true
    },
    seatClass: {
        type: String,
        enum: ['economy', 'firstClass'],
        required: true
    },
    passengers: {
        type: Number,
        required: true,
        min: 1
    },
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    departureDate: {
        type: Date
    },
    paymentMethod: {
        type: String,
        enum: ['credit_card', 'mobile_money'],
    },
    paymentDetails: {
        type: mongoose.Schema.Types.Mixed
    },
    paymentDate: {
        type: Date
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Booking', bookingSchema);