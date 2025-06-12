import rateLimit from 'express-rate-limit'

// Configuration constants
const FIFTEEN_MINUTES = 15 * 60 * 1000
const ONE_MINUTE = 1 * 60 * 1000

// Skip rate limiting in test environment and development (temporarily disabled for frontend integration)
const skip = () => true // Temporarily disabled for development

// Helper function to create rate limit error response
const createRateLimitHandler = (message) => (req, res) => {
  res.status(429).json({
    error: 'Too Many Requests',
    details: message,
  })
}

// Helper function to create common rate limit configuration
const createRateLimitConfig = (windowMs, max, message) => ({
  windowMs,
  max,
  message: {
    error: 'Too Many Requests',
    details: message,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  handler: createRateLimitHandler(message),
})

// Rate limiter for authentication routes (signup, login)
export const authRateLimit = rateLimit(
  createRateLimitConfig(
    FIFTEEN_MINUTES,
    5,
    'Too many authentication attempts, please try again in 15 minutes'
  )
)

// General rate limiter for API requests
export const generalRateLimit = rateLimit(
  createRateLimitConfig(
    FIFTEEN_MINUTES,
    100,
    'Too many requests, please try again later'
  )
)

// Stricter rate limiter for thought creation
export const thoughtCreationRateLimit = rateLimit(
  createRateLimitConfig(
    ONE_MINUTE,
    5,
    'Too many thoughts created, please wait a minute before posting again'
  )
)
