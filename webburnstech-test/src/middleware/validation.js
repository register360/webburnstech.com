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

// More flexible validation patterns
const patterns = {
  phone: /^[\+]?[0-9\s\-\(\)]{10,15}$/, // More flexible phone validation
  name: /^[a-zA-Z\s\-'.]+$/,
  otp: /^\d{6}$/,
  cityState: /^[a-zA-Z\s\-,.]+$/
};

// Registration validation - MORE FLEXIBLE
const validateRegistration = (req, res, next) => {
  const schema = Joi.object({
    firstName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes'
      }),

    lastName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes'
      }),

    fatherName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'Father\'s name can only contain letters, spaces, hyphens, and apostrophes'
      }),

    motherName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'Mother\'s name can only contain letters, spaces, hyphens, and apostrophes'
      }),

    dob: Joi.date()
      .max(new Date(new Date().getFullYear() - 16, new Date().getMonth(), new Date().getDate())) // Minimum 16 years old
      .min(new Date(new Date().getFullYear() - 100, new Date().getMonth(), new Date().getDate())) // Maximum 100 years old
      .required()
      .messages({
        ...customMessages,
        'date.max': 'You must be at least 16 years old to register',
        'date.min': 'Please enter a valid date of birth'
      }),

    gender: Joi.string()
      .valid('male', 'female', 'other')
      .required()
      .messages(customMessages),

    email: Joi.string()
      .email()
      .max(100)
      .required()
      .messages(customMessages),

    phone: Joi.string()
      .min(10)
      .max(15)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'Please provide a valid phone number (10-15 digits)'
      }),

    city: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'City name can only contain letters, spaces, hyphens, and commas'
      }),

    state: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'State name can only contain letters, spaces, hyphens, and commas'
      })
  });

  validateRequest(req, res, next, schema);
};

// Generic validation middleware
const validateRequest = (req, res, next, schema, property = 'body') => {
  const data = req[property];
  
  console.log('Validating data:', data); // ADD DEBUG LOGGING
  
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      type: detail.type
    }));

    console.log('Validation errors:', errors); // ADD DEBUG LOGGING

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
