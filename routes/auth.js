import express from 'express'
import { signup, login, getProfile } from '../controllers/authController.js'
import { authenticateToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// POST /auth/signup - Register new user
router.post('/signup', signup)

// POST /auth/login - Authenticate user
router.post('/login', login)

// GET /auth/me - Get current user profile (requires authentication)
router.get('/me', authenticateToken, getProfile)

export default router 