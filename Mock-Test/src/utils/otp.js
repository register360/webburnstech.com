const crypto = require('crypto');

// Generate 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Generate OTP with expiry (15 minutes)
const generateOTPWithExpiry = () => {
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  
  return { code, expiresAt };
};

// Validate OTP
const validateOTP = (userOTP, storedOTP, expiresAt) => {
  if (!userOTP || !storedOTP || !expiresAt) {
    return { valid: false, message: 'Invalid OTP data' };
  }
  
  if (new Date() > new Date(expiresAt)) {
    return { valid: false, message: 'OTP has expired' };
  }
  
  if (userOTP !== storedOTP) {
    return { valid: false, message: 'Invalid OTP' };
  }
  
  return { valid: true, message: 'OTP is valid' };
};

module.exports = {
  generateOTP,
  generateOTPWithExpiry,
  validateOTP,
};
