// models/Guest.js
import mongoose from 'mongoose';

const guestSchema = new mongoose.Schema({
  createdAt: { type: Date, expires: '1h', default: Date.now } // Optional: automatically remove after 1 hour
});

const Guest = mongoose.model('Guest', guestSchema);
export default Guest;
