import mongoose from 'mongoose'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

/**
 * Sets up MongoDB connection event handlers
 */
const setupConnectionEvents = () => {
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err)
  })

  mongoose.connection.on('disconnected', () => {
    console.error('MongoDB disconnected')
  })
}

/**
 * Sets up graceful shutdown handling for MongoDB connection
 */
const setupGracefulShutdown = () => {
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close()
      process.exit(0)
    } catch (err) {
      console.error('Error closing MongoDB connection:', err)
      process.exit(1)
    }
  })
}

/**
 * Connects to MongoDB database
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const mongoUrl =
      process.env.MONGO_URL || 'mongodb://localhost:27017/happy-thoughts'

    await mongoose.connect(mongoUrl)

    setupConnectionEvents()
    setupGracefulShutdown()
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message)
    process.exit(1)
  }
}

export default connectDB
