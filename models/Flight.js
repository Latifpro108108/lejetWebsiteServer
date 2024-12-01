const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema({
  flightNumber: {
    type: String,
    unique: true,
    sparse: true // Allows null/undefined values
  },
  airplane: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Airplane',
    required: true
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  departureTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        if (!this.isRecurring) {
          return value > new Date();
        }
        return true;
      },
      message: 'Departure time must be in the future'
    }
  },
  arrivalTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > this.departureTime;
      },
      message: 'Arrival time must be after departure time'
    }
  },
  economyPrice: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  firstClassPrice: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  availableSeats: {
    economy: {
      type: Number,
      required: true,
      min: [0, 'Available seats cannot be negative']
    },
    firstClass: {
      type: Number,
      required: true,
      min: [0, 'Available seats cannot be negative']
    }
  },
  status: {
    type: String,
    enum: ['scheduled', 'cancelled', 'completed'],
    default: 'scheduled'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringDays: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }],
  recurringEndDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Generate flight number before saving
flightSchema.pre('save', async function(next) {
  if (!this.flightNumber) {
    const year = new Date(this.departureTime).getFullYear().toString().slice(-2);
    const month = (new Date(this.departureTime).getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.flightNumber = `LJ${year}${month}${random}`;
  }
  next();
});

flightSchema.index({ airplane: 1, departureTime: 1 });
flightSchema.index({ from: 1, to: 1, departureTime: 1 });
flightSchema.index({ status: 1 });
flightSchema.index({ departureTime: 1, from: 1, to: 1, status: 1 });
flightSchema.index({ flightNumber: 1 }, { sparse: true });
flightSchema.statics.findReturnFlights = async function(fromCity, toCity, departureDate) {
  const startDate = new Date(departureDate);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 30); // Show flights for next 30 days

  return this.find({
    from: toCity,
    to: fromCity,
    departureTime: {
      $gte: startDate,
      $lte: endDate
    },
    status: 'scheduled',
    'availableSeats.economy': { $gt: 0 }
  }).sort({ departureTime: 1 });
};

module.exports = mongoose.model('Flight', flightSchema);

