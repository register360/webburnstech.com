const Joi = require('joi');

// Registration validation schema
const registrationSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).required(),
  lastName: Joi.string().trim().min(2).max(50).required(),
  fatherName: Joi.string().trim().min(2).max(50).required(),
  motherName: Joi.string().trim().min(2).max(50).required(),
  dob: Joi.date().max('now').required(),
  gender: Joi.string().valid('male', 'female', 'other').required(),
  email: Joi.string().email().lowercase().trim().required(),
  phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
  city: Joi.string().trim().min(2).max(50).required(),
  state: Joi.string().trim().min(2).max(50).required(),
  terms: Joi.boolean().valid(true).required(),
});

// OTP verification schema
const otpSchema = Joi.object({
  userId: Joi.string().required(),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
});

// Login validation schema
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Contact form validation schema
const contactSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().trim().required(),
  message: Joi.string().trim().min(10).max(1000).required(),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
});

// Answer save validation schema
const answerSaveSchema = Joi.object({
  qId: Joi.string().required(),
  selectedIndex: Joi.number().integer().min(0).max(3).required(),
  isMarkedForReview: Joi.boolean().default(false),
});

// Cheating event validation schema
const cheatingEventSchema = Joi.object({
  type: Joi.string().valid('tabChange', 'copy', 'paste', 'unauthorizedFocus', 'multipleTabs', 'devTools', 'contextMenu').required(),
  details: Joi.string().max(500).optional(),
});

// Admin application action schema
const applicationActionSchema = Joi.object({
  adminNotes: Joi.string().max(500).optional(),
});

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }
    
    req.validatedData = value;
    next();
  };
};

module.exports = {
  validate,
  registrationSchema,
  otpSchema,
  loginSchema,
  contactSchema,
  answerSaveSchema,
  cheatingEventSchema,
  applicationActionSchema,
};
