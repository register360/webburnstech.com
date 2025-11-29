const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  fatherName: {
    type: String,
    required: true,
    trim: true
  },
  motherName: {
    type: String,
    required: true,
    trim: true
  },
  dob: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'accepted', 'rejected'],
    default: 'pending'
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  examPassword: {
    type: String
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  verifiedAt: Date,
  acceptedAt: Date,
  rejectedAt: Date,
  credentialsSentAt: Date,
  adminNotes: String
});

// Generate OTP
userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
  };
  return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function(enteredOTP) {
  if (!this.otp || !this.otp.code || !this.otp.expiresAt) {
    return false;
  }
  
  if (this.otp.expiresAt < new Date()) {
    return false;
  }
  
  return this.otp.code === enteredOTP;
};
const collectionName = process.env.USER_COLLECTION || 'users_exam';
module.exports = mongoose.model('User', userSchema, collectionName);
