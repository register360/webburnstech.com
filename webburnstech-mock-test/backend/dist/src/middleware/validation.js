"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateExamTime = exports.validatePasswordStrength = exports.customJoi = exports.patterns = exports.sanitizeText = exports.sanitizePhone = exports.sanitizeEmail = exports.sanitizeString = exports.validateDate = exports.validatePhone = exports.validateEmail = exports.validateFileUpload = exports.validatePagination = exports.validateAdminLogin = exports.validateAdminAction = exports.validateCheatingEvent = exports.validateSaveAnswer = exports.validateStartAttempt = exports.validateBulkQuestions = exports.validateQuestion = exports.validateContact = exports.validateLogin = exports.validateOTP = exports.validateRegistration = void 0;
const joi_1 = __importDefault(require("joi"));
const appGlobals_1 = require("../lib/appGlobals");
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
const patterns = {
    phone: /^[\+]?[1-9][\d]{0,15}$/,
    name: /^[a-zA-Z\s\-'.]+$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    otp: /^\d{6}$/,
    token: /^[a-zA-Z0-9\-_]+$/,
    cityState: /^[a-zA-Z\s\-,.]+$/,
    questionText: /^[a-zA-Z0-9\s\-\?\.\,\!\(\)\:\;\'\"\&\+\-\=\*\/\\]+$/
};
exports.patterns = patterns;
const validateRegistration = (req, res, next) => {
    const schema = joi_1.default.object({
        firstName: joi_1.default.string()
            .pattern(patterns.name)
            .min(2)
            .max(50)
            .required()
            .messages({
            ...customMessages,
            'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes'
        }),
        lastName: joi_1.default.string()
            .pattern(patterns.name)
            .min(2)
            .max(50)
            .required()
            .messages({
            ...customMessages,
            'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes'
        }),
        fatherName: joi_1.default.string()
            .pattern(patterns.name)
            .min(2)
            .max(50)
            .required()
            .messages({
            ...customMessages,
            'string.pattern.base': 'Father\'s name can only contain letters, spaces, hyphens, and apostrophes'
        }),
        motherName: joi_1.default.string()
            .pattern(patterns.name)
            .min(2)
            .max(50)
            .required()
            .messages({
            ...customMessages,
            'string.pattern.base': 'Mother\'s name can only contain letters, spaces, hyphens, and apostrophes'
        }),
        dob: joi_1.default.date()
            .max(new Date(new Date().getFullYear() - 16, new Date().getMonth(), new Date().getDate()))
            .min(new Date(new Date().getFullYear() - 100, new Date().getMonth(), new Date().getDate()))
            .required()
            .messages({
            ...customMessages,
            'date.max': 'You must be at least 16 years old to register',
            'date.min': 'Please enter a valid date of birth'
        }),
        gender: joi_1.default.string()
            .valid('male', 'female', 'other')
            .required()
            .messages(customMessages),
        email: joi_1.default.string()
            .email()
            .max(100)
            .required()
            .messages(customMessages),
        phone: joi_1.default.string()
            .pattern(patterns.phone)
            .min(10)
            .max(15)
            .required()
            .messages({
            ...customMessages,
            'string.pattern.base': 'Please provide a valid phone number'
        }),
        city: joi_1.default.string()
            .pattern(patterns.cityState)
            .min(2)
            .max(50)
            .required()
            .messages({
            ...customMessages,
            'string.pattern.base': 'City name can only contain letters, spaces, hyphens, and commas'
        }),
        state: joi_1.default.string()
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
exports.validateRegistration = validateRegistration;
const validateOTP = (req, res, next) => {
    const schema = joi_1.default.object({
        userId: joi_1.default.string()
            .hex()
            .length(24)
            .required()
            .messages({
            ...customMessages,
            'string.hex': 'Invalid user ID format',
            'string.length': 'User ID must be 24 characters long'
        }),
        otp: joi_1.default.string()
            .pattern(patterns.otp)
            .required()
            .messages({
            ...customMessages,
            'string.pattern.base': 'OTP must be a 6-digit number'
        })
    });
    validateRequest(req, res, next, schema);
};
exports.validateOTP = validateOTP;
const validateLogin = (req, res, next) => {
    const schema = joi_1.default.object({
        email: joi_1.default.string()
            .email()
            .max(100)
            .required()
            .messages(customMessages),
        password: joi_1.default.string()
            .min(8)
            .max(100)
            .required()
            .messages(customMessages)
    });
    validateRequest(req, res, next, schema);
};
exports.validateLogin = validateLogin;
const validateContact = (req, res, next) => {
    const schema = joi_1.default.object({
        firstName: joi_1.default.string()
            .pattern(patterns.name)
            .min(2)
            .max(50)
            .required()
            .messages({
            ...customMessages,
            'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes'
        }),
        lastName: joi_1.default.string()
            .pattern(patterns.name)
            .min(2)
            .max(50)
            .required()
            .messages({
            ...customMessages,
            'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes'
        }),
        email: joi_1.default.string()
            .email()
            .max(100)
            .required()
            .messages(customMessages),
        phone: joi_1.default.string()
            .pattern(patterns.phone)
            .min(10)
            .max(15)
            .optional()
            .allow('')
            .messages({
            ...customMessages,
            'string.pattern.base': 'Please provide a valid phone number'
        }),
        priority: joi_1.default.string()
            .valid('low', 'medium', 'high')
            .required()
            .messages(customMessages),
        subject: joi_1.default.string()
            .valid('registration', 'verification', 'exam-access', 'technical', 'payment', 'results', 'other')
            .required()
            .messages(customMessages),
        message: joi_1.default.string()
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
exports.validateContact = validateContact;
const validateQuestion = (req, res, next) => {
    const schema = joi_1.default.object({
        topic: joi_1.default.string()
            .valid('Python', 'Java', 'JS', 'C', 'C++', 'Node.js', 'Tech')
            .required()
            .messages(customMessages),
        difficulty: joi_1.default.string()
            .valid('low', 'medium', 'high')
            .required()
            .messages(customMessages),
        questionText: joi_1.default.string()
            .min(10)
            .max(1000)
            .required()
            .messages({
            ...customMessages,
            'string.min': 'Question text must be at least 10 characters long',
            'string.max': 'Question text must not exceed 1000 characters'
        }),
        options: joi_1.default.array()
            .items(joi_1.default.string()
            .min(1)
            .max(500)
            .required()
            .messages({
            ...customMessages,
            'string.min': 'Option cannot be empty',
            'string.max': 'Option must not exceed 500 characters'
        }))
            .length(4)
            .required()
            .messages({
            ...customMessages,
            'array.length': 'Exactly 4 options are required'
        }),
        correctOptionIndex: joi_1.default.number()
            .integer()
            .min(0)
            .max(3)
            .required()
            .messages({
            ...customMessages,
            'number.min': 'Correct option index must be between 0 and 3',
            'number.max': 'Correct option index must be between 0 and 3'
        }),
        explanation: joi_1.default.string()
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
exports.validateQuestion = validateQuestion;
const validateBulkQuestions = (req, res, next) => {
    const questionSchema = joi_1.default.object({
        topic: joi_1.default.string()
            .valid('Python', 'Java', 'JS', 'C', 'C++', 'Node.js', 'Tech')
            .required(),
        difficulty: joi_1.default.string()
            .valid('low', 'medium', 'high')
            .required(),
        questionText: joi_1.default.string()
            .min(10)
            .max(1000)
            .required(),
        options: joi_1.default.array()
            .items(joi_1.default.string().min(1).max(500).required())
            .length(4)
            .required(),
        correctOptionIndex: joi_1.default.number()
            .integer()
            .min(0)
            .max(3)
            .required(),
        explanation: joi_1.default.string()
            .max(1000)
            .optional()
            .allow('')
    });
    const schema = joi_1.default.array()
        .items(questionSchema)
        .min(1)
        .max(1000)
        .required()
        .messages({
        ...customMessages,
        'array.min': 'At least one question is required',
        'array.max': 'Cannot upload more than 1000 questions at once'
    });
    validateRequest(req, res, next, schema);
};
exports.validateBulkQuestions = validateBulkQuestions;
const validateStartAttempt = (req, res, next) => {
    const schema = joi_1.default.object({
        examDate: joi_1.default.string()
            .isoDate()
            .optional()
            .messages({
            ...customMessages,
            'string.isoDate': 'Exam date must be in ISO format'
        })
    });
    validateRequest(req, res, next, schema);
};
exports.validateStartAttempt = validateStartAttempt;
const validateSaveAnswer = (req, res, next) => {
    const schema = joi_1.default.object({
        qId: joi_1.default.string()
            .hex()
            .length(24)
            .required()
            .messages({
            ...customMessages,
            'string.hex': 'Invalid question ID format',
            'string.length': 'Question ID must be 24 characters long'
        }),
        selectedIndex: joi_1.default.number()
            .integer()
            .min(-1)
            .max(3)
            .required()
            .messages({
            ...customMessages,
            'number.min': 'Selected index must be between -1 and 3',
            'number.max': 'Selected index must be between -1 and 3'
        }),
        isMarkedForReview: joi_1.default.boolean()
            .default(false)
            .messages(customMessages)
    });
    validateRequest(req, res, next, schema);
};
exports.validateSaveAnswer = validateSaveAnswer;
const validateCheatingEvent = (req, res, next) => {
    const schema = joi_1.default.object({
        type: joi_1.default.string()
            .valid('tabChange', 'copy', 'paste', 'unauthorizedFocus', 'multipleTabs', 'contextMenu', 'devTools')
            .required()
            .messages(customMessages),
        details: joi_1.default.string()
            .max(500)
            .optional()
            .allow('')
            .messages({
            ...customMessages,
            'string.max': 'Details must not exceed 500 characters'
        }),
        timestamp: joi_1.default.date()
            .max('now')
            .optional()
            .messages({
            ...customMessages,
            'date.max': 'Timestamp cannot be in the future'
        })
    });
    validateRequest(req, res, next, schema);
};
exports.validateCheatingEvent = validateCheatingEvent;
const validateAdminAction = (req, res, next) => {
    const schema = joi_1.default.object({
        adminNotes: joi_1.default.string()
            .max(1000)
            .optional()
            .allow('')
            .messages({
            ...customMessages,
            'string.max': 'Admin notes must not exceed 1000 characters'
        }),
        status: joi_1.default.string()
            .valid('accepted', 'rejected')
            .optional()
            .messages(customMessages)
    });
    validateRequest(req, res, next, schema);
};
exports.validateAdminAction = validateAdminAction;
const validateAdminLogin = (req, res, next) => {
    const schema = joi_1.default.object({
        adminToken: joi_1.default.string()
            .min(8)
            .max(100)
            .required()
            .messages({
            ...customMessages,
            'string.min': 'Admin token must be at least 8 characters long'
        }),
        securityCode: joi_1.default.string()
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
exports.validateAdminLogin = validateAdminLogin;
const validatePagination = (req, res, next) => {
    const schema = joi_1.default.object({
        page: joi_1.default.number()
            .integer()
            .min(1)
            .default(1)
            .messages({
            ...customMessages,
            'number.min': 'Page must be at least 1'
        }),
        limit: joi_1.default.number()
            .integer()
            .min(1)
            .max(100)
            .default(20)
            .messages({
            ...customMessages,
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100'
        }),
        status: joi_1.default.string()
            .valid('pending', 'verified', 'accepted', 'rejected')
            .optional()
            .messages(customMessages),
        priority: joi_1.default.string()
            .valid('low', 'medium', 'high')
            .optional()
            .messages(customMessages),
        topic: joi_1.default.string()
            .valid('Python', 'Java', 'JS', 'C', 'C++', 'Node.js', 'Tech')
            .optional()
            .messages(customMessages),
        difficulty: joi_1.default.string()
            .valid('low', 'medium', 'high')
            .optional()
            .messages(customMessages),
        search: joi_1.default.string()
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
exports.validatePagination = validatePagination;
const validateFileUpload = (req, res, next) => {
    const schema = joi_1.default.object({
        'content-type': joi_1.default.string()
            .valid('application/json', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            .required()
            .messages({
            ...customMessages,
            'any.only': 'File must be JSON, CSV, or Excel format'
        })
    });
    if (!req.file) {
        return res.status(400).json({
            error: 'File is required'
        });
    }
    validateRequest(req, res, next, schema, 'headers');
};
exports.validateFileUpload = validateFileUpload;
const validateEmail = (email) => {
    const emailSchema = joi_1.default.string().email();
    const { error } = emailSchema.validate(email);
    return !error;
};
exports.validateEmail = validateEmail;
const validatePhone = (phone) => {
    const phoneSchema = joi_1.default.string().pattern(patterns.phone);
    const { error } = phoneSchema.validate(phone);
    return !error;
};
exports.validatePhone = validatePhone;
const validateDate = (date) => {
    const dateSchema = joi_1.default.date().iso();
    const { error } = dateSchema.validate(date);
    return !error;
};
exports.validateDate = validateDate;
const sanitizeString = (input) => {
    return input
        .trim()
        .replace(/[<>]/g, '')
        .replace(/\s+/g, ' ')
        .substring(0, 1000);
};
exports.sanitizeString = sanitizeString;
const sanitizeEmail = (email) => {
    return email.trim().toLowerCase().substring(0, 100);
};
exports.sanitizeEmail = sanitizeEmail;
const sanitizePhone = (phone) => {
    return phone.replace(/[^\d+]/g, '').substring(0, 15);
};
exports.sanitizePhone = sanitizePhone;
const sanitizeText = (text) => {
    return text
        .trim()
        .replace(/[<>]/g, '')
        .replace(/\s+/g, ' ')
        .substring(0, 5000);
};
exports.sanitizeText = sanitizeText;
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
        appGlobals_1.logger.warn(`Validation failed for ${property}:`, {
            path: req.path,
            errors: errors.map(e => e.field),
            ip: req.ip
        });
        return res.status(400).json({
            error: 'Validation failed',
            details: errors
        });
    }
    req[property] = value;
    next();
};
exports.customJoi = joi_1.default.extend((joi) => ({
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
const validatePasswordStrength = (password) => {
    const errors = [];
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
exports.validatePasswordStrength = validatePasswordStrength;
const validateExamTime = () => {
    const examStart = new Date('2025-11-30T10:30:00Z');
    const examEnd = new Date('2025-11-30T12:30:00Z');
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
exports.validateExamTime = validateExamTime;
exports.default = {
    validateRegistration: exports.validateRegistration,
    validateOTP: exports.validateOTP,
    validateLogin: exports.validateLogin,
    validateContact: exports.validateContact,
    validateQuestion: exports.validateQuestion,
    validateBulkQuestions: exports.validateBulkQuestions,
    validateStartAttempt: exports.validateStartAttempt,
    validateSaveAnswer: exports.validateSaveAnswer,
    validateCheatingEvent: exports.validateCheatingEvent,
    validateAdminAction: exports.validateAdminAction,
    validateAdminLogin: exports.validateAdminLogin,
    validatePagination: exports.validatePagination,
    validateFileUpload: exports.validateFileUpload,
    validateEmail: exports.validateEmail,
    validatePhone: exports.validatePhone,
    validateDate: exports.validateDate,
    validatePasswordStrength: exports.validatePasswordStrength,
    validateExamTime: exports.validateExamTime,
    sanitizeString: exports.sanitizeString,
    sanitizeEmail: exports.sanitizeEmail,
    sanitizePhone: exports.sanitizePhone,
    sanitizeText: exports.sanitizeText,
    patterns,
    customJoi: exports.customJoi
};
//# sourceMappingURL=validation.js.map