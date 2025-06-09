import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Middleware to verify JWT token and attach user to request
export const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) // Remove 'Bearer ' prefix
      : null

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Access token is required'
      })
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production'
    const decoded = jwt.verify(token, jwtSecret)

    // Extract user ID from the correct field (with fallbacks)
    const userId = decoded.userId || decoded.sub || decoded.id

    // Get user from database
    const user = await User.findById(userId)
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'User not found'
      })
    }

    // Attach user info to request object
    req.user = {
      userId: user._id,
      email: user.email,
      name: user.name
    }

    next()
  } catch (error) {
    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Invalid access token'
      })
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Access token has expired'
      })
    }

    // Generic server error
    res.status(500).json({
      error: 'Internal Server Error',
      details: 'Failed to authenticate token'
    })
  }
}

// Optional middleware - allows authenticated and unauthenticated users
export const optionalAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) // Remove 'Bearer ' prefix
      : null

    if (!token) {
      // No token provided, continue without user
      req.user = null
      return next()
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production'
    const decoded = jwt.verify(token, jwtSecret)

    // Extract user ID from the correct field (frontend stores it in 'sub')
    const userId = decoded.userId || decoded.sub || decoded.id

    // Get user from database
    const user = await User.findById(userId)
    if (user) {
      req.user = {
        userId: user._id,
        email: user.email,
        name: user.name
      }
    } else {
      req.user = null
    }

    next()
  } catch (error) {
    // If token is invalid, continue without user instead of throwing error
    req.user = null
    next()
  }
}

// Middleware to check if user owns a resource
export const requireOwnership = (getResourceUserId) => {
  return (req, res, next) => {
    try {
      const resourceUserId = getResourceUserId(req)
      
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          details: 'Authentication required'
        })
      }

      if (req.user.userId.toString() !== resourceUserId.toString()) {
        return res.status(403).json({
          error: 'Forbidden',
          details: 'You can only access your own resources'
        })
      }

      next()
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        details: 'Failed to verify ownership'
      })
    }
  }
} 