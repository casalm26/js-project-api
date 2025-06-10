import { body, validationResult } from 'express-validator'

// Validation constants
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
const PASSWORD_MIN_LENGTH = 6
const NAME_MAX_LENGTH = 50
const MESSAGE_MIN_LENGTH = 5
const MESSAGE_MAX_LENGTH = 140

// Query validation constants
const VALID_SORT_FIELDS = ['hearts', 'createdAt', 'updatedAt', 'category', '_id', 'message']
const MAX_LIMIT = 100

// Helper function for email validation
const createEmailValidation = () =>
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .matches(EMAIL_REGEX)
    .withMessage(
      'Email format is invalid. Please use a standard email format like user@example.com'
    )
    .normalizeEmail()
    .trim()

// Helper function for password validation with strength requirements
const createStrongPasswordValidation = () =>
  body('password')
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`
    )
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )

// Helper function for simple password validation (login)
const createPasswordValidation = () =>
  body('password').notEmpty().withMessage('Password is required').trim()

// Query validation helper functions
const validatePositiveInteger = (value, name, min = 1, max = Infinity) => {
  if (!value) return null
  
  const num = parseInt(value)
  if (isNaN(num) || num < min || num > max) {
    if (max === Infinity) {
      return `${name} must be a positive integer >= ${min}`
    }
    return `${name} must be a positive integer between ${min} and ${max}`
  }
  return null
}

const validateSortField = (sort) => {
  if (!sort) return null
  
  const field = sort.startsWith('-') ? sort.slice(1) : sort
  if (!VALID_SORT_FIELDS.includes(field)) {
    return `sort field must be one of: ${VALID_SORT_FIELDS.join(', ')} (use - prefix for descending order)`
  }
  return null
}

const validateCategory = (category) => {
  if (!category) return null
  
  if (category.trim().length === 0) {
    return 'category cannot be empty'
  }
  return null
}

const validateDate = (dateString, fieldName) => {
  if (!dateString) return null
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    return `${fieldName} must be a valid date (ISO 8601 format recommended, e.g., 2024-01-01T00:00:00Z)`
  }
  return null
}

// Validation rules for user signup
export const validateSignup = [
  createEmailValidation(),
  createStrongPasswordValidation(),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: NAME_MAX_LENGTH })
    .withMessage(`Name must be between 1 and ${NAME_MAX_LENGTH} characters`)
    .escape(),
]

// Validation rules for user login
export const validateLogin = [
  createEmailValidation(),
  createPasswordValidation(),
]

// Validation rules for creating/updating thoughts
export const validateThought = [
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: MESSAGE_MIN_LENGTH, max: MESSAGE_MAX_LENGTH })
    .withMessage(
      `Message must be between ${MESSAGE_MIN_LENGTH} and ${MESSAGE_MAX_LENGTH} characters`
    )
    .trim()
    .escape(),
]

// Query validation for thoughts listing
export const validateThoughtsQuery = (req, res, next) => {
  const { page, limit, sort, category, minHearts, newerThan } = req.query
  const errors = []

  const pageError = validatePositiveInteger(page, 'page')
  if (pageError) errors.push(pageError)

  const limitError = validatePositiveInteger(limit, 'limit', 1, MAX_LIMIT)
  if (limitError) errors.push(limitError)

  const sortError = validateSortField(sort)
  if (sortError) errors.push(sortError)

  const categoryError = validateCategory(category)
  if (categoryError) errors.push(categoryError)

  const heartsError = validatePositiveInteger(minHearts, 'minHearts', 0)
  if (heartsError) errors.push(heartsError)

  const dateError = validateDate(newerThan, 'newerThan')
  if (dateError) errors.push(dateError)

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Bad query parameters',
      details: errors,
    })
  }

  next()
}

// ID validation for thoughts
export const validateThoughtId = (req, res, next) => {
  const { id } = req.params

  if (!id?.trim()) {
    return res.status(400).json({
      error: 'Bad request',
      details: 'ID parameter cannot be empty',
    })
  }

  next()
}

// Helper function to format validation errors
const formatValidationError = (error) => ({
  field: error.path,
  message: error.msg,
  value: error.value,
})

// Middleware to handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(formatValidationError)

    return res.status(422).json({
      error: 'Validation Error',
      details: errorMessages,
    })
  }

  next()
}

// Combined validation middleware for signup
export const signupValidation = [...validateSignup, handleValidationErrors]

// Combined validation middleware for login
export const loginValidation = [...validateLogin, handleValidationErrors]

// Combined validation middleware for thoughts
export const thoughtValidation = [...validateThought, handleValidationErrors]
