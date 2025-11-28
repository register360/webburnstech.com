import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/appGlobals';

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
  'any.only': '{{#label}} must be one of: {{#valids}}',
  'string.pattern.base': '{{#label}} must be a valid {{#label}}',
  'array.min': '{{#label}} must have at least {{#limit}} items',
  'object.unknown': '{{#label}} is not allowed'
};

// Common validation patterns
const patterns = {
  phone: /^[\+]?[1-9][\d]{0,15}$/, // International phone format
  name: /^[a-zA-Z\s\-'.]+$/, // Names with basic special characters
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, // Strong password
  otp: /^\d{6}$/, // 6-digit OTP
  token: /^[a-zA-Z0-9\-_]+$/, // Basic token format
  cityState: /^[a-zA-Z\s\-,.]+$/, // City/state names
  questionText: /^[a-zA-Z0-9\s\-\?\.\,\!\(\)\:\;\'\"\&\+\-\=\*\/\\]+$/ // Question text with common symbols
};

// Registration validation schema
export const validateRegistration = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    firstName: Joi.string()
      .pattern(patterns.name)
      .min(2)
      .max(50)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes'
      }),

    lastName: Joi.string()
      .pattern(patterns.name)
      .min(2)
      .max(50)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes'
      }),

    fatherName: Joi.string()
      .pattern(patterns.name)
      .min(2)
      .max(50)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'Father\'s name can only contain letters, spaces, hyphens, and apostrophes'
      }),

    motherName: Joi.string()
      .pattern(patterns.name)
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
      .pattern(patterns.phone)
      .min(10)
      .max(15)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'Please provide a valid phone number'
      }),

    city: Joi.string()
      .pattern(patterns.cityState)
      .min(2)
      .max(50)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'City name can only contain letters, spaces, hyphens, and commas'
      }),

    state: Joi.string()
      .pattern(patterns.cityState)
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

// OTP validation schema
export const validateOTP = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    userId: Joi.string()
      .hex()
      .length(24)
      .required()
      .messages({
        ...customMessages,
        'string.hex': 'Invalid user ID format',
        'string.length': 'User ID must be 24 characters long'
      }),

    otp: Joi.string()
      .pattern(patterns.otp)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'OTP must be a 6-digit number'
      })
  });

  validateRequest(req, res, next, schema);
};

// Login validation schema
export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      .max(100)
      .required()
      .messages(customMessages),

    password: Joi.string()
      .min(8)
      .max(100)
      .required()
      .messages(customMessages)
  });

  validateRequest(req, res, next, schema);
};

// Contact form validation schema
export const validateContact = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    firstName: Joi.string()
      .pattern(patterns.name)
      .min(2)
      .max(50)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes'
      }),

    lastName: Joi.string()
      .pattern(patterns.name)
      .min(2)
      .max(50)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes'
      }),

    email: Joi.string()
      .email()
      .max(100)
      .required()
      .messages(customMessages),

    phone: Joi.string()
      .pattern(patterns.phone)
      .min(10)
      .max(15)
      .optional()
      .allow('')
      .messages({
        ...customMessages,
        'string.pattern.base': 'Please provide a valid phone number'
      }),

    priority: Joi.string()
      .valid('low', 'medium', 'high')
      .required()
      .messages(customMessages),

    subject: Joi.string()
      .valid(
        'registration',
        'verification',
        'exam-access',
        'technical',
        'payment',
        'results',
        'other'
      )
      .required()
      .messages(customMessages),

    message: Joi.string()
      .min(20)
      .max(2000)
      .required()
      .messages({
        ...customMessages,
        'string.min': 'Message must be at least 20 characters long',
        'string.max': 'Message must not exceed 2000 characters'
      })
  });

  validateRequest(req, res, next, schema);
};

// Question validation schema
export const validateQuestion = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    topic: Joi.string()
      .valid('Python', 'Java', 'JS', 'C', 'C++', 'Node.js', 'Tech')
      .required()
      .messages(customMessages),

    difficulty: Joi.string()
      .valid('low', 'medium', 'high')
      .required()
      .messages(customMessages),

    questionText: Joi.string()
      .min(10)
      .max(1000)
      .required()
      .messages({
        ...customMessages,
        'string.min': 'Question text must be at least 10 characters long',
        'string.max': 'Question text must not exceed 1000 characters'
      }),

    options: Joi.array()
      .items(
        Joi.string()
          .min(1)
          .max(500)
          .required()
          .messages({
            ...customMessages,
            'string.min': 'Option cannot be empty',
            'string.max': 'Option must not exceed 500 characters'
          })
      )
      .length(4)
      .required()
      .messages({
        ...customMessages,
        'array.length': 'Exactly 4 options are required'
      }),

    correctOptionIndex: Joi.number()
      .integer()
      .min(0)
      .max(3)
      .required()
      .messages({
        ...customMessages,
        'number.min': 'Correct option index must be between 0 and 3',
        'number.max': 'Correct option index must be between 0 and 3'
      }),

    explanation: Joi.string()
      .max(1000)
      .optional()
      .allow('')
      .messages({
        ...customMessages,
        'string.max': 'Explanation must not exceed 1000 characters'
      })
  });

  validateRequest(req, res, next, schema);
};

// Bulk questions validation schema
export const validateBulkQuestions = (req: Request, res: Response, next: NextFunction) => {
  const questionSchema = Joi.object({
    topic: Joi.string()
      .valid('Python', 'Java', 'JS', 'C', 'C++', 'Node.js', 'Tech')
      .required(),

    difficulty: Joi.string()
      .valid('low', 'medium', 'high')
      .required(),

    questionText: Joi.string()
      .min(10)
      .max(1000)
      .required(),

    options: Joi.array()
      .items(Joi.string().min(1).max(500).required())
      .length(4)
      .required(),

    correctOptionIndex: Joi.number()
      .integer()
      .min(0)
      .max(3)
      .required(),

    explanation: Joi.string()
      .max(1000)
      .optional()
      .allow('')
  });

  const schema = Joi.array()
    .items(questionSchema)
    .min(1)
    .max(1000) // Limit bulk upload to 1000 questions at once
    .required()
    .messages({
      ...customMessages,
      'array.min': 'At least one question is required',
      'array.max': 'Cannot upload more than 1000 questions at once'
    });

  validateRequest(req, res, next, schema);
};

// Exam attempt validation schemas
export const validateStartAttempt = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    examDate: Joi.string()
      .isoDate()
      .optional()
      .messages({
        ...customMessages,
        'string.isoDate': 'Exam date must be in ISO format'
      })
  });

  validateRequest(req, res, next, schema);
};

export const validateSaveAnswer = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    qId: Joi.string()
      .hex()
      .length(24)
      .required()
      .messages({
        ...customMessages,
        'string.hex': 'Invalid question ID format',
        'string.length': 'Question ID must be 24 characters long'
      }),

    selectedIndex: Joi.number()
      .integer()
      .min(-1) // -1 for unselected
      .max(3)
      .required()
      .messages({
        ...customMessages,
        'number.min': 'Selected index must be between -1 and 3',
        'number.max': 'Selected index must be between -1 and 3'
      }),

    isMarkedForReview: Joi.boolean()
      .default(false)
      .messages(customMessages)
  });

  validateRequest(req, res, next, schema);
};

export const validateCheatingEvent = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    type: Joi.string()
      .valid('tabChange', 'copy', 'paste', 'unauthorizedFocus', 'multipleTabs', 'contextMenu', 'devTools')
      .required()
      .messages(customMessages),

    details: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        ...customMessages,
        'string.max': 'Details must not exceed 500 characters'
      }),

    timestamp: Joi.date()
      .max('now')
      .optional()
      .messages({
        ...customMessages,
        'date.max': 'Timestamp cannot be in the future'
      })
  });

  validateRequest(req, res, next, schema);
};

// Admin validation schemas
export const validateAdminAction = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    adminNotes: Joi.string()
      .max(1000)
      .optional()
      .allow('')
      .messages({
        ...customMessages,
        'string.max': 'Admin notes must not exceed 1000 characters'
      }),

    status: Joi.string()
      .valid('accepted', 'rejected')
      .optional()
      .messages(customMessages)
  });

  validateRequest(req, res, next, schema);
};

export const validateAdminLogin = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    adminToken: Joi.string()
      .min(8)
      .max(100)
      .required()
      .messages({
        ...customMessages,
        'string.min': 'Admin token must be at least 8 characters long'
      }),

    securityCode: Joi.string()
      .max(10)
      .optional()
      .allow('')
      .messages({
        ...customMessages,
        'string.max': 'Security code must not exceed 10 characters'
      })
  });

  validateRequest(req, res, next, schema);
};

// Pagination and query validation
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        ...customMessages,
        'number.min': 'Page must be at least 1'
      }),

    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .messages({
        ...customMessages,
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      }),

    status: Joi.string()
      .valid('pending', 'verified', 'accepted', 'rejected')
      .optional()
      .messages(customMessages),

    priority: Joi.string()
      .valid('low', 'medium', 'high')
      .optional()
      .messages(customMessages),

    topic: Joi.string()
      .valid('Python', 'Java', 'JS', 'C', 'C++', 'Node.js', 'Tech')
      .optional()
      .messages(customMessages),

    difficulty: Joi.string()
      .valid('low', 'medium', 'high')
      .optional()
      .messages(customMessages),

    search: Joi.string()
      .max(100)
      .optional()
      .allow('')
      .messages({
        ...customMessages,
        'string.max': 'Search query must not exceed 100 characters'
      })
  });

  validateRequest(req, res, next, schema, 'query');
};

// File upload validation
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    'content-type': Joi.string()
      .valid(
        'application/json',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      .required()
      .messages({
        ...customMessages,
        'any.only': 'File must be JSON, CSV, or Excel format'
      })
  });

  // Check if file exists
  if (!(req as any).file){
    return res.status(400).json({
      error: 'File is required'
    });
  }

  validateRequest(req, res, next, schema, 'headers');
};

// Email validation helper
export const validateEmail = (email: string): boolean => {
  const emailSchema = Joi.string().email();
  const { error } = emailSchema.validate(email);
  return !error;
};

// Phone validation helper
export const validatePhone = (phone: string): boolean => {
  const phoneSchema = Joi.string().pattern(patterns.phone);
  const { error } = phoneSchema.validate(phone);
  return !error;
};

// Date validation helper
export const validateDate = (date: string): boolean => {
  const dateSchema = Joi.date().iso();
  const { error } = dateSchema.validate(date);
  return !error;
};

// Sanitization functions
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and > to prevent XSS
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 1000); // Limit length
};

export const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase().substring(0, 100);
};

export const sanitizePhone = (phone: string): string => {
  return phone.replace(/[^\d+]/g, '').substring(0, 15);
};

export const sanitizeText = (text: string): string => {
  return text
    .trim()
    .replace(/[<>]/g, '') // Basic XSS prevention
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 5000); // Limit length
};

// Generic validation middleware
const validateRequest = (
  req: Request, 
  res: Response, 
  next: NextFunction, 
  schema: Joi.ObjectSchema | Joi.ArraySchema, 
  property: 'body' | 'query' | 'params' | 'headers' = 'body'
) => {
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

    logger.warn(`Validation failed for ${property}:`, {
      path: req.path,
      errors: errors.map(e => e.field),
      ip: req.ip
    });

    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  // Replace request data with sanitized and validated data
  req[property] = value;
  next();
};

// Export validation patterns for use in other files
export { patterns };

// Custom Joi extensions for additional validation
export const customJoi = Joi.extend((joi) => ({
  type: 'futureDate',
  base: joi.date(),
  messages: {
    'futureDate.max': '{{#label}} cannot be in the future'
  },
  rules: {
  notFuture: {
    method() {
      return this.$_addRule('notFuture');
    },
      validate(value, helpers) {
        if (value > new Date()) {
          return helpers.error('futureDate.max');
        }
        return value;
      }
    }
  }
}));

// Password strength validation
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Exam time validation
export const validateExamTime = (): { isValid: boolean; message?: string } => {
  const examStart = new Date('2025-11-30T10:30:00Z'); // 16:00 IST in UTC
  const examEnd = new Date('2025-11-30T12:30:00Z'); // 18:00 IST in UTC
  const now = new Date();

  if (now < examStart) {
    return {
      isValid: false,
      message: `Exam will be available on November 30, 2025 from 16:00 to 18:00 IST`
    };
  }

  if (now > examEnd) {
    return {
      isValid: false,
      message: 'The exam period has ended'
    };
  }

  return { isValid: true };
};

// Export validation middleware for use in routes
export default {
  validateRegistration,
  validateOTP,
  validateLogin,
  validateContact,
  validateQuestion,
  validateBulkQuestions,
  validateStartAttempt,
  validateSaveAnswer,
  validateCheatingEvent,
  validateAdminAction,
  validateAdminLogin,
  validatePagination,
  validateFileUpload,
  validateEmail,
  validatePhone,
  validateDate,
  validatePasswordStrength,
  validateExamTime,
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeText,
  patterns,
  customJoi
};
