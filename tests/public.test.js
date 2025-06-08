import request from 'supertest'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import thoughtsRoutes from '../routes/thoughts.js'
import authRoutes from '../routes/auth.js'
import indexRoutes from '../src/routes/index.js'

// Create test app
const createTestApp = () => {
  const app = express()
  
  // Middleware
  app.use(helmet())
  app.use(cors())
  app.use(express.json())
  
  // Routes
  app.use('/', indexRoutes)
  app.use('/thoughts', thoughtsRoutes)
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

describe('Public Endpoints Tests', () => {
  let app
  let userToken
  let thoughtIds = []

  beforeAll(async () => {
    app = createTestApp()
    
    // Create a test user and get token for creating thoughts
    const userResponse = await request(app)
      .post('/auth/signup')
      .send({
        email: 'testuser@test.com',
        password: 'Password123',
        name: 'Test User'
      })
    userToken = userResponse.body.accessToken

    // Create multiple test thoughts for pagination testing
    for (let i = 1; i <= 25; i++) {
      const response = await request(app)
        .post('/thoughts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          message: `Test thought number ${i} for pagination testing`,
          category: i % 2 === 0 ? 'Travel' : 'Food'
        })
      thoughtIds.push(response.body._id)
    }
  })

  describe('GET / - API Documentation', () => {
    it('should return API endpoints documentation', async () => {
      const response = await request(app)
        .get('/')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
      
      // Check for expected endpoints
      const endpoints = response.body.map(endpoint => endpoint.path)
      expect(endpoints).toContain('/')
      expect(endpoints).toContain('/thoughts')
      expect(endpoints).toContain('/thoughts/:id')
      expect(endpoints).toContain('/thoughts/:id/like')
      expect(endpoints).toContain('/auth/signup')
      expect(endpoints).toContain('/auth/login')
    })
  })

  describe('GET /thoughts - List Thoughts', () => {
    it('should return thoughts with default pagination', async () => {
      const response = await request(app)
        .get('/thoughts')
        .expect(200)

      expect(response.body).toHaveProperty('thoughts')
      expect(response.body).toHaveProperty('pagination')
      expect(Array.isArray(response.body.thoughts)).toBe(true)
      expect(response.body.thoughts.length).toBeLessThanOrEqual(20) // Default limit
      
      // Check pagination metadata
      expect(response.body.pagination).toHaveProperty('currentPage', 1)
      expect(response.body.pagination).toHaveProperty('totalPages')
      expect(response.body.pagination).toHaveProperty('totalCount')
      expect(response.body.pagination).toHaveProperty('hasNextPage')
      expect(response.body.pagination).toHaveProperty('hasPrevPage', false)
    })

    it('should return thoughts with custom pagination', async () => {
      const response = await request(app)
        .get('/thoughts?page=2&limit=5')
        .expect(200)

      expect(response.body.thoughts.length).toBeLessThanOrEqual(5)
      expect(response.body.pagination.currentPage).toBe(2)
      expect(response.body.pagination.hasPrevPage).toBe(true)
    })

    it('should filter thoughts by category', async () => {
      const response = await request(app)
        .get('/thoughts?category=Travel')
        .expect(200)

      expect(response.body.thoughts.length).toBeGreaterThan(0)
      // All returned thoughts should have category containing "Travel"
      response.body.thoughts.forEach(thought => {
        expect(thought.category.toLowerCase()).toContain('travel')
      })
    })

    it('should sort thoughts by different fields', async () => {
      // Test sorting by createdAt descending (default)
      const defaultResponse = await request(app)
        .get('/thoughts?limit=5')
        .expect(200)

      // Test sorting by createdAt ascending
      const ascResponse = await request(app)
        .get('/thoughts?sort=createdAt&limit=5')
        .expect(200)

      // The order should be different
      expect(defaultResponse.body.thoughts[0]._id).not.toBe(ascResponse.body.thoughts[0]._id)
    })

    it('should handle empty results gracefully', async () => {
      const response = await request(app)
        .get('/thoughts?category=NonExistentCategory')
        .expect(200)

      expect(response.body.thoughts).toEqual([])
      expect(response.body.pagination.totalCount).toBe(0)
      expect(response.body.pagination.totalPages).toBe(0)
    })

    it('should handle invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/thoughts?page=0&limit=-5')
        .expect(200)

      // Should use default values for invalid parameters
      expect(response.body.pagination.currentPage).toBe(1)
      expect(response.body.thoughts.length).toBeLessThanOrEqual(20)
    })
  })

  describe('GET /thoughts/:id - Get Single Thought', () => {
    it('should return a single thought with valid ID', async () => {
      const thoughtId = thoughtIds[0]
      
      const response = await request(app)
        .get(`/thoughts/${thoughtId}`)
        .expect(200)

      expect(response.body._id).toBe(thoughtId)
      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('category')
      expect(response.body).toHaveProperty('hearts')
      expect(response.body).toHaveProperty('likedBy')
      expect(response.body).toHaveProperty('createdAt')
      expect(response.body).toHaveProperty('owner')
    })

    it('should return 404 for non-existent thought ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011' // Valid ObjectId format but doesn't exist
      
      const response = await request(app)
        .get(`/thoughts/${fakeId}`)
        .expect(404)

      expect(response.body.error).toBe('Not found')
      expect(response.body.details).toBe(`Thought with ID '${fakeId}' does not exist`)
    })

    it('should return 400 for invalid thought ID format', async () => {
      const invalidId = 'invalid-id-format'
      
      const response = await request(app)
        .get(`/thoughts/${invalidId}`)
        .expect(400)

      expect(response.body.error).toBe('Bad Request')
      expect(response.body.details).toBe('Invalid thought ID format')
    })

    it('should return thought with populated owner information', async () => {
      const thoughtId = thoughtIds[0]
      
      const response = await request(app)
        .get(`/thoughts/${thoughtId}`)
        .expect(200)

      expect(response.body.owner).toHaveProperty('email')
      expect(response.body.owner).toHaveProperty('name')
      expect(response.body.owner).not.toHaveProperty('password')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large page numbers gracefully', async () => {
      const response = await request(app)
        .get('/thoughts?page=999999')
        .expect(200)

      expect(response.body.thoughts).toEqual([])
      expect(response.body.pagination.hasNextPage).toBe(false)
    })

    it('should handle very large limit values', async () => {
      const response = await request(app)
        .get('/thoughts?limit=99999')
        .expect(200)

      // Should return all available thoughts but not crash
      expect(Array.isArray(response.body.thoughts)).toBe(true)
    })

    it('should handle special characters in category filter', async () => {
      const response = await request(app)
        .get('/thoughts?category=Test%20Category%20With%20Spaces')
        .expect(200)

      // Should not crash and return proper response structure
      expect(response.body).toHaveProperty('thoughts')
      expect(response.body).toHaveProperty('pagination')
    })

    it('should handle concurrent requests to the same endpoint', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app).get(`/thoughts?page=${i + 1}&limit=3`)
      )

      const responses = await Promise.all(requests)
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty('thoughts')
        expect(response.body).toHaveProperty('pagination')
      })
    })
  })
}) 