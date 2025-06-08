import express from 'express'
import { signup, login, getProfile } from '../controllers/authController.js'
import { authenticateToken } from '../middleware/authMiddleware.js'
import { signupValidation, loginValidation } from '../middleware/validation.js'
import { authRateLimit } from '../middleware/rateLimiting.js'

const router = express.Router()

// POST /auth/signup - Register new user (with validation and rate limiting)
router.post('/signup', authRateLimit, signupValidation, signup)

// POST /auth/login - Authenticate user (with validation and rate limiting)
router.post('/login', authRateLimit, loginValidation, login)

// GET /auth/me - Get current user profile (requires authentication)
router.get('/me', authenticateToken, getProfile)

export default router 