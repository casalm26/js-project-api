import cors from "cors"
import express from "express"
import dotenv from "dotenv"
import connectDB from "./db.js"
import indexRoutes from "./routes/index.js"
import thoughtsRoutes from "../routes/thoughts.js"
import authRoutes from "../routes/auth.js"

// Load environment variables
dotenv.config()

// App configuration
const port = process.env.PORT || 8080
const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use("/", indexRoutes)
app.use("/thoughts", thoughtsRoutes)
app.use("/auth", authRoutes)

// Catch-all 404 route for unknown paths
app.use("*", (req, res) => {
  res.status(404).json({ 
    error: "Endpoint not found",
    details: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`
  })
})

// Enhanced global error-handling middleware
app.use((err, req, res, _next) => {
  console.error('Global error handler caught:', err)

  // Default error response
  let status = 500
  let error = "Internal Server Error"
  let details = err.message || "An unexpected error occurred"

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation errors
    status = 422
    error = "Validation Error"
    details = Object.values(err.errors).map(e => e.message)
  } else if (err.name === 'CastError') {
    // Invalid ObjectId errors
    status = 400
    error = "Bad Request"
    details = "Invalid ID format"
  } else if (err.code === 11000) {
    // MongoDB duplicate key errors
    status = 409
    error = "Conflict"
    const field = Object.keys(err.keyPattern)[0]
    details = `${field} already exists`
  } else if (err.name === 'JsonWebTokenError') {
    // JWT errors
    status = 401
    error = "Unauthorized"
    details = "Invalid access token"
  } else if (err.name === 'TokenExpiredError') {
    // JWT expiration errors
    status = 401
    error = "Unauthorized"
    details = "Access token has expired"
  } else if (err.status || err.statusCode) {
    // Custom errors with status codes
    status = err.status || err.statusCode
    error = err.name || error
    details = err.message || details
  }

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production' && status === 500) {
    details = "An internal server error occurred"
  }

  res.status(status).json({
    error,
    details
  })
})

// Start the server with MongoDB connection
const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB()
    
    // Start the Express server after successful DB connection
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
