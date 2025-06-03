import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Generate JWT token
const generateToken = (userId) => {
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production'
  return jwt.sign({ userId }, jwtSecret, { expiresIn: '24h' })
}

// POST /signup - Register new user
export const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        details: 'User with this email already exists'
      })
    }

    // Create new user (password will be hashed by pre-save hook)
    const user = new User({ email, password, name })
    await user.save()

    // Generate JWT token
    const token = generateToken(user._id)

    // Return user data and token (password excluded by toJSON method)
    res.status(201).json({
      message: 'User created successfully',
      user: user.toJSON(),
      accessToken: token
    })

  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message)
      return res.status(422).json({
        error: 'Validation failed',
        details: validationErrors
      })
    }

    // Handle duplicate key errors (in case unique index isn't caught above)
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Conflict',
        details: 'User with this email already exists'
      })
    }

    // Generic server error
    res.status(500).json({
      error: 'Internal Server Error',
      details: 'Failed to create user'
    })
  }
}

// POST /login - Authenticate user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        details: 'Email and password are required'
      })
    }

    // Find user by email
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Invalid email or password'
      })
    }

    // Compare password using the user model method
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Invalid email or password'
      })
    }

    // Generate JWT token
    const token = generateToken(user._id)

    // Return user data and token
    res.status(200).json({
      message: 'Login successful',
      user: user.toJSON(),
      accessToken: token
    })

  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      details: 'Failed to authenticate user'
    })
  }
}

// GET /me - Get current user profile (requires authentication)
export const getProfile = async (req, res) => {
  try {
    // req.user is set by auth middleware
    const user = await User.findById(req.user.userId)
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'User not found'
      })
    }

    res.status(200).json({
      user: user.toJSON()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      details: 'Failed to get user profile'
    })
  }
} 