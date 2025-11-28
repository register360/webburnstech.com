const Joi = require('joi');

// Custom validation messages
const customMessages = {
  'string.empty': '{{#label}} is required',
  'any.required': '{{#label}} is required',
  'string.email': 'Please provide a valid email address',
  'string.min': '{{#label}} must be at least {{#limit}} characters long',
  'string.max': '{{#label}} must not exceed {{#limit}} characters',
  'number.min': '{{#label}} must be at least {{#limit}}',
  'number.max': '{{#label}} must not exceed {{#limit}}',
  'date.base': '{{#label}} must be a valid date',
  'date.min': '{{#label}} must be from {{#limit}} or later',
  'date.max': '{{#label}} must be before {{#limit}}',
  'any.only': '{{#label}} must be one of: {{#valids}}'
};

// Validation patterns
const patterns = {
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  name: /^[a-zA-Z\s\-'.]+$/,
  otp: /^\d{6}$/,
  cityState: /^[a-zA-Z\s\-,.]+$/
};

// Registration validation
const validateRegistration = (req, res, next) => {
  const schema = Joi.object({
    firstName: Joi.string().pattern(patterns.name).min(2).max(50).required(),
    lastName: Joi.string().pattern(patterns.name).min(2).max(50).required(),
    fatherName: Joi.string().pattern(patterns.name).min(2).max(50).required(),
    motherName: Joi.string().pattern(patterns.name).min(2).max(50).required(),
    dob: Joi.date().required(),
    gender: Joi.string().valid('male', 'female', 'other').required(),
    email: Joi.string().email().max(100).required(),
    phone: Joi.string().pattern(patterns.phone).min(10).max(15).required(),
    city: Joi.string().pattern(patterns.cityState).min(2).max(50).required(),
    state: Joi.string().pattern(patterns.cityState).min(2).max(50).required()
  });

  validateRequest(req, res, next, schema);
};

// OTP validation
const validateOTP = (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.string().hex().length(24).required(),
    otp: Joi.string().pattern(patterns.otp).required()
  });

  validateRequest(req, res, next, schema);
};

// Contact validation
const validateContact = (req, res, next) => {
  const schema = Joi.object({
    firstName: Joi.string().pattern(patterns.name).min(2).max(50).required(),
    lastName: Joi.string().pattern(patterns.name).min(2).max(50).required(),
    email: Joi.string().email().max(100).required(),
    phone: Joi.string().pattern(patterns.phone).min(10).max(15).optional().allow(''),
    priority: Joi.string().valid('low', 'medium', 'high').required(),
    subject: Joi.string().valid('registration', 'verification', 'exam-access', 'technical', 'payment', 'results', 'other').required(),
    message: Joi.string().min(20).max(2000).required()
  });

  validateRequest(req, res, next, schema);
};

// Generic validation middleware
const validateRequest = (req, res, next, schema, property = 'body') => {
  const data = req[property];
  
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  req[property] = value;
  next();
};

module.exports = {
  validateRegistration,
  validateOTP,
  validateContact,
  patterns
};
