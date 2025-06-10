import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Generate JWT token
const generateToken = (userId) => {
  const jwtSecret =
    process.env.JWT_SECRET || 'fallback-secret-change-in-production'
  return jwt.sign({ userId }, jwtSecret, { expiresIn: '24h' })
}

const createErrorResponse = (status, error, details) => ({
  status,
  json: { error, details },
})

const createSuccessResponse = (status, data) => ({
  status,
  json: data,
})

const handleValidationError = (error) => {
  const validationErrors = Object.values(error.errors).map(err => err.message)
  return createErrorResponse(422, 'Validation failed', validationErrors)
}

const handleDuplicateUserError = () => 
  createErrorResponse(409, 'Conflict', 'User with this email already exists')

const handleServerError = (message) => 
  createErrorResponse(500, 'Internal Server Error', message)

// POST /signup - Register new user
export const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      const errorResponse = handleDuplicateUserError()
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    // Create new user (password will be hashed by pre-save hook)
    const user = new User({ email, password, name })
    await user.save()

    // Generate JWT token
    const token = generateToken(user._id)

    // Return user data and token (password excluded by toJSON method)
    const successResponse = createSuccessResponse(201, {
      message: 'User created successfully',
      user: user.toJSON(),
      accessToken: token,
    })

    res.status(successResponse.status).json(successResponse.json)
  } catch (error) {
    let errorResponse

    if (error.name === 'ValidationError') {
      errorResponse = handleValidationError(error)
    } else if (error.code === 11000) {
      errorResponse = handleDuplicateUserError()
    } else {
      errorResponse = handleServerError('Failed to create user')
    }

    res.status(errorResponse.status).json(errorResponse.json)
  }
}

// POST /login - Authenticate user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate required fields
    if (!email || !password) {
      const errorResponse = createErrorResponse(400, 'Bad Request', 'Email and password are required')
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    // Find user by email
    const user = await User.findOne({ email })
    if (!user) {
      const errorResponse = createErrorResponse(401, 'Unauthorized', 'Invalid email or password')
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    // Compare password using the user model method
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      const errorResponse = createErrorResponse(401, 'Unauthorized', 'Invalid email or password')
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    // Generate JWT token
    const token = generateToken(user._id)

    // Return user data and token
    const successResponse = createSuccessResponse(200, {
      message: 'Login successful',
      user: user.toJSON(),
      accessToken: token,
    })

    res.status(successResponse.status).json(successResponse.json)
  } catch {
    const errorResponse = handleServerError('Failed to authenticate user')
    res.status(errorResponse.status).json(errorResponse.json)
  }
}

// GET /me - Get current user profile (requires authentication)
export const getProfile = async (req, res) => {
  try {
    // req.user is set by auth middleware
    const user = await User.findById(req.user.userId)
    if (!user) {
      const errorResponse = createErrorResponse(404, 'Not Found', 'User not found')
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    const successResponse = createSuccessResponse(200, {
      user: user.toJSON(),
    })
    res.status(successResponse.status).json(successResponse.json)
  } catch {
    const errorResponse = handleServerError('Failed to get user profile')
    res.status(errorResponse.status).json(errorResponse.json)
  }
}
