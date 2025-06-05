import mongoose from 'mongoose'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const connectDB = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/happy-thoughts'
    
    const conn = await mongoose.connect(mongoUrl, {
      // These options help with connection stability
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    
    console.log(`MongoDB Connected: ${conn.connection.host}`)
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err)
    })
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected')
    })
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close()
        console.log('MongoDB connection closed through app termination')
        process.exit(0)
      } catch (err) {
        console.error('Error closing MongoDB connection:', err)
        process.exit(1)
      }
    })
    
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message)
    process.exit(1) // Exit on connection failure
  }
}

export default connectDB 