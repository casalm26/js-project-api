import express from 'express'
import { signup, login, getProfile } from '../controllers/authController.js'

const router = express.Router()

// POST /auth/signup - Register new user
router.post('/signup', signup)

// POST /auth/login - Authenticate user
router.post('/login', login)

// GET /auth/me - Get current user profile (will require auth middleware later)
router.get('/me', getProfile)

export default router 