import { body, validationResult } from 'express-validator'

// STRETCH-06: Enhanced email validation with regex
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

// Validation rules for user signup
export const validateSignup = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .matches(emailRegex)
    .withMessage('Email format is invalid. Please use a standard email format like user@example.com')
    .normalizeEmail()
    .trim(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Name must be between 1 and 50 characters')
    .escape() // Sanitize HTML entities
]

// Validation rules for user login
export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .matches(emailRegex)
    .withMessage('Email format is invalid. Please use a standard email format like user@example.com')
    .normalizeEmail()
    .trim(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .trim()
]

// Validation rules for creating/updating thoughts
export const validateThought = [
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 5, max: 140 })
    .withMessage('Message must be between 5 and 140 characters')
    .trim()
    .escape() // Sanitize HTML entities
]

// Middleware to handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }))
    
    return res.status(422).json({
      error: 'Validation Error',
      details: errorMessages
    })
  }
  
  next()
}

// Combined validation middleware for signup
export const signupValidation = [
  ...validateSignup,
  handleValidationErrors
]

// Combined validation middleware for login
export const loginValidation = [
  ...validateLogin,
  handleValidationErrors
]

// Combined validation middleware for thoughts
export const thoughtValidation = [
  ...validateThought,
  handleValidationErrors
] 