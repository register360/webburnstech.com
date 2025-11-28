const crypto = require('crypto');

// Generate random password (8 characters: alphanumeric)
const generatePassword = (length = 8) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  
  return password;
};

// Generate secure exam password
const generateExamPassword = () => {
  return generatePassword(8);
};

module.exports = {
  generatePassword,
  generateExamPassword,
};
