import request from 'supertest'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRoutes from '../routes/auth.js'

// Create test app
const createTestApp = () => {
  const app = express()
  
  // Middleware
  app.use(helmet())
  app.use(cors())
  app.use(express.json())
  
  // Routes
  app.use('/auth', authRoutes)
  
  // Global error handler
  app.use((err, req, res, next) => {
    res.status(500).json({
      error: 'Internal Server Error',
      details: err.message
    })
  })
  
  return app
}

describe('Authentication Tests', () => {
  let app

  beforeAll(() => {
    app = createTestApp()
  })

  describe('POST /auth/signup', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User'
      }

      const response = await request(app)
        .post('/auth/signup')
        .send(userData)
        .expect(201)

      expect(response.body).toHaveProperty('message', 'User created successfully')
      expect(response.body).toHaveProperty('user')
      expect(response.body).toHaveProperty('accessToken')
      expect(response.body.user.email).toBe(userData.email)
      expect(response.body.user.name).toBe(userData.name)
      expect(response.body.user).not.toHaveProperty('password')
    })

    it('should return 409 for duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Password123',
        name: 'Test User'
      }

      // Create user first time
      await request(app)
        .post('/auth/signup')
        .send(userData)
        .expect(201)

      // Try to create same user again
      const response = await request(app)
        .post('/auth/signup')
        .send(userData)
        .expect(409)

      expect(response.body.error).toBe('Conflict')
      expect(response.body.details).toBe('User with this email already exists')
    })

    it('should return 422 for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123',
        name: 'Test User'
      }

      const response = await request(app)
        .post('/auth/signup')
        .send(userData)
        .expect(422)

      expect(response.body.error).toBe('Validation Error')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: 'Please provide a valid email address'
          })
        ])
      )
    })

    it('should return 422 for weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User'
      }

      const response = await request(app)
        .post('/auth/signup')
        .send(userData)
        .expect(422)

      expect(response.body.error).toBe('Validation Error')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: expect.stringContaining('Password must')
          })
        ])
      )
    })
  })

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await request(app)
        .post('/auth/signup')
        .send({
          email: 'logintest@example.com',
          password: 'Password123',
          name: 'Login Test User'
        })
    })

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'logintest@example.com',
        password: 'Password123'
      }

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Login successful')
      expect(response.body).toHaveProperty('user')
      expect(response.body).toHaveProperty('accessToken')
      expect(response.body.user.email).toBe(loginData.email)
      expect(response.body.user).not.toHaveProperty('password')
    })

    it('should return 401 for invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123'
      }

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body.error).toBe('Unauthorized')
      expect(response.body.details).toBe('Invalid email or password')
    })

    it('should return 401 for invalid password', async () => {
      const loginData = {
        email: 'logintest@example.com',
        password: 'WrongPassword123'
      }

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body.error).toBe('Unauthorized')
      expect(response.body.details).toBe('Invalid email or password')
    })

    it('should return 422 for missing fields', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com' })
        .expect(422)

      expect(response.body.error).toBe('Validation Error')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: 'Password is required'
          })
        ])
      )
    })

    it('should return 422 for invalid email format', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'Password123'
        })
        .expect(422)

      expect(response.body.error).toBe('Validation Error')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: 'Please provide a valid email address'
          })
        ])
      )
    })
  })
}) 