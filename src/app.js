import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import dotenv from 'dotenv'
import connectDB from './config/db.js'
import indexRoutes from './index.js'
import thoughtsRoutes from './routes/thoughts.js'
import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'

// Load environment variables
dotenv.config()

// App configuration
const port = process.env.PORT || 8080
const app = express()

/**
 * Sets up security and basic middleware
 * @param {express.Application} app - Express application instance
 */
const setupMiddleware = (app) => {
  app.use(helmet())
  app.use(cors())
  app.use(express.json())
}

/**
 * Sets up API routes
 * @param {express.Application} app - Express application instance
 */
const setupRoutes = (app) => {
  app.use('/', indexRoutes)
  app.use('/thoughts', thoughtsRoutes)
  app.use('/auth', authRoutes)
  app.use('/users', usersRoutes)
}

/**
 * Sets up 404 handler for unknown endpoints
 * @param {express.Application} app - Express application instance
 */
const setup404Handler = (app) => {
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Endpoint not found',
      details: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`,
    })
  })
}

/**
 * Determines error status and message based on error type
 * @param {Error} err - The error object
 * @returns {Object} Error details with status, error, and details
 */
const getErrorDetails = (err) => {
  let status = 500
  let error = 'Internal Server Error'
  let details = err.message || 'An unexpected error occurred'

  if (err.name === 'ValidationError') {
    status = 422
    error = 'Validation Error'
    details = Object.values(err.errors).map((e) => e.message)
  } else if (err.name === 'CastError') {
    status = 400
    error = 'Bad Request'
    details = 'Invalid ID format'
  } else if (err.code === 11000) {
    status = 409
    error = 'Conflict'
    const field = Object.keys(err.keyPattern)[0]
    details = `${field} already exists`
  } else if (err.name === 'JsonWebTokenError') {
    status = 401
    error = 'Unauthorized'
    details = 'Invalid access token'
  } else if (err.name === 'TokenExpiredError') {
    status = 401
    error = 'Unauthorized'
    details = 'Access token has expired'
  } else if (err.status || err.statusCode) {
    status = err.status || err.statusCode
    error = err.name || error
    details = err.message || details
  }

  return { status, error, details }
}

/**
 * Sets up global error handling middleware
 * @param {express.Application} app - Express application instance
 */
const setupErrorHandler = (app) => {
  app.use((err, req, res, _next) => {
    console.error('Global error handler caught:', err)

    const { status, error, details } = getErrorDetails(err)

    // Don't expose internal error details in production
    const finalDetails = process.env.NODE_ENV === 'production' && status === 500
      ? 'An internal server error occurred'
      : details

    res.status(status).json({
      error,
      details: finalDetails,
    })
  })
}

/**
 * Starts the Express server after connecting to MongoDB
 */
const startServer = async () => {
  try {
    await connectDB()
    
    app.listen(port, () => {
      if (process.env.NODE_ENV !== 'test') {
        console.error(`Server running on http://localhost:${port}`)
      }
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Setup application
setupMiddleware(app)
setupRoutes(app)
setup404Handler(app)
setupErrorHandler(app)

// Start server
startServer()

export default app
