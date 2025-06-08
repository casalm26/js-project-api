import rateLimit from 'express-rate-limit'

// Skip rate limiting in test environment and development (temporarily disabled for frontend integration)
const skipSuccessfulRequests = process.env.NODE_ENV === 'test'
const skip = () => true // Temporarily disabled for development

// Rate limiter for authentication routes (signup, login)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too Many Requests',
    details: 'Too many authentication attempts, please try again in 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip, // Skip in test environment
  // Custom handler for when limit is exceeded
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      details: 'Too many authentication attempts, please try again in 15 minutes'
    })
  }
})

// General rate limiter for API requests
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too Many Requests',
    details: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip, // Skip in test environment
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      details: 'Too many requests, please try again later'
    })
  }
})

// Stricter rate limiter for thought creation
export const thoughtCreationRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 thought creations per minute
  message: {
    error: 'Too Many Requests',
    details: 'Too many thoughts created, please wait a minute before posting again'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip, // Skip in test environment
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      details: 'Too many thoughts created, please wait a minute before posting again'
    })
  }
}) 