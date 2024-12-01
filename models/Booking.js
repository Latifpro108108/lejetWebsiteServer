const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    outboundFlight: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flight',
        required: true
    },
    returnFlight: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flight'
    },
    outboundTicketNumber: {
        type: String,
        required: true,
        unique: true
    },
    returnTicketNumber: {
        type: String,
        unique: true,
        sparse: true
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
    outboundAmount: {
        type: Number,
        required: true
    },
    returnAmount: {
        type: Number
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
        type: Date,
        required: true
    },
    returnDate: {
        type: Date
    },
    isRoundTrip: {
        type: Boolean,
        default: false
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