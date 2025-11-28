const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  fatherName: { type: String, required: true, trim: true },
  motherName: { type: String, required: true, trim: true },
  dob: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'verified', 'accepted', 'rejected'], default: 'pending' },
  otp: {
    code: String,
    expiresAt: Date
  },
  examCredentials: {
    username: String,
    password: String
  },
  registeredAt: { type: Date, default: Date.now },
  verifiedAt: Date,
  acceptedAt: Date,
  rejectedAt: Date,
  credentialsSentAt: Date,
  adminNotes: String
});

userSchema.index({ email: 1 });
userSchema.index({ status: 1 });

module.exports = mongoose.model('User', userSchema);