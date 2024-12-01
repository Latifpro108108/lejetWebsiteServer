const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = "mongodb+srv://dabonelati:jaxZvQqCWe0CMIsO@lejetcluster.xwh0k.mongodb.net/lejet-airlines?retryWrites=true&w=majority&appName=lejetcluster";

async function fixBookingIndex() {
  try {
    console.log('Attempting to connect to MongoDB...');
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('Connected to MongoDB');
    
    // List all indexes first
    const indexes = await mongoose.connection.collection('bookings').listIndexes().toArray();
    console.log('Current indexes:', indexes);

    try {
      // Try to drop the index if it exists
      await mongoose.connection.collection('bookings').dropIndex('ticketNumber_1');
      console.log('Successfully dropped ticketNumber index');
    } catch (indexError) {
      console.log('Index might not exist:', indexError.message);
    }

    // Create new Booking schema
    const bookingSchema = new mongoose.Schema({
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      flight: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flight',
        required: true
      },
      ticketNumber: {
        type: String,
        unique: true,
        required: true,
        default: function() {
          return 'TKT' + Date.now() + Math.floor(Math.random() * 1000);
        }
      },
      seatClass: String,
      passengers: Number,
      totalAmount: Number,
      status: {
        type: String,
        default: 'pending'
      }
    });

    // Update existing documents to add ticket numbers where missing
    const bookings = await mongoose.connection.collection('bookings').find({ ticketNumber: null }).toArray();
    console.log(`Found ${bookings.length} bookings without ticket numbers`);

    for (const booking of bookings) {
      const ticketNumber = 'TKT' + Date.now() + Math.floor(Math.random() * 1000);
      await mongoose.connection.collection('bookings').updateOne(
        { _id: booking._id },
        { $set: { ticketNumber: ticketNumber } }
      );
      console.log(`Updated booking ${booking._id} with ticket number ${ticketNumber}`);
    }

    console.log('Database update completed');
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixBookingIndex();