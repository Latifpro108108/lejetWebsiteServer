const mongoose = require('mongoose');

const airplaneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    min: [1, 'Capacity must be at least 1']
  },
  currentLocation: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Add index for better query performance
airplaneSchema.index({ name: 1 });

module.exports = mongoose.model('Airplane', airplaneSchema);