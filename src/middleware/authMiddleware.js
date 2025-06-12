import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production'

const extractTokenFromHeader = (authHeader) => {
  return authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : null
}

const createUserObject = (user) => ({
  userId: user._id,
  email: user.email,
  name: user.name,
})

const createErrorResponse = (status, error, details) => ({
  status,
  json: { error, details },
})

const handleJwtError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return createErrorResponse(401, 'Unauthorized', 'Invalid access token')
  }
  if (error.name === 'TokenExpiredError') {
    return createErrorResponse(401, 'Unauthorized', 'Access token has expired')
  }
  return createErrorResponse(500, 'Internal Server Error', 'Failed to authenticate token')
}

// Middleware to verify JWT token and attach user to request
export const authenticateToken = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization)

    if (!token) {
      const errorResponse = createErrorResponse(401, 'Unauthorized', 'Access token is required')
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    const userId = decoded.userId || decoded.sub || decoded.id

    const user = await User.findById(userId)
    if (!user) {
      const errorResponse = createErrorResponse(401, 'Unauthorized', 'User not found')
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    req.user = createUserObject(user)
    next()
  } catch (error) {
    const errorResponse = handleJwtError(error)
    res.status(errorResponse.status).json(errorResponse.json)
  }
}

// Optional middleware - allows authenticated and unauthenticated users
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization)

    if (!token) {
      req.user = null
      return next()
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    const userId = decoded.userId || decoded.sub || decoded.id

    const user = await User.findById(userId)
    req.user = user ? createUserObject(user) : null

    next()
  } catch {
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
        const errorResponse = createErrorResponse(401, 'Unauthorized', 'Authentication required')
        return res.status(errorResponse.status).json(errorResponse.json)
      }

      if (req.user.userId.toString() !== resourceUserId.toString()) {
        const errorResponse = createErrorResponse(403, 'Forbidden', 'You can only access your own resources')
        return res.status(errorResponse.status).json(errorResponse.json)
      }

      next()
    } catch {
      const errorResponse = createErrorResponse(500, 'Internal Server Error', 'Failed to verify ownership')
      res.status(errorResponse.status).json(errorResponse.json)
    }
  }
}
