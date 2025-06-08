import request from 'supertest'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import thoughtsRoutes from '../routes/thoughts.js'
import authRoutes from '../routes/auth.js'

// Create test app
const createTestApp = () => {
  const app = express()
  
  // Middleware
  app.use(helmet())
  app.use(cors())
  app.use(express.json())
  
  // Routes
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

describe('Thoughts Protected Routes Tests', () => {
  let app
  let userToken
  let user2Token
  let thoughtId
  let user2ThoughtId

  beforeAll(async () => {
    app = createTestApp()
    
    // Create test users and get tokens
    const user1Response = await request(app)
      .post('/auth/signup')
      .send({
        email: 'user1@test.com',
        password: 'Password123',
        name: 'User One'
      })
    userToken = user1Response.body.accessToken

    const user2Response = await request(app)
      .post('/auth/signup')
      .send({
        email: 'user2@test.com',
        password: 'Password123',
        name: 'User Two'
      })
    user2Token = user2Response.body.accessToken
  })

  describe('POST /thoughts - Create Thought', () => {
    it('should create a thought with valid token and data', async () => {
      const thoughtData = {
        message: 'This is a test thought for creating',
        category: 'General'
      }

      const response = await request(app)
        .post('/thoughts')
        .set('Authorization', `Bearer ${userToken}`)
        .send(thoughtData)
        .expect(201)

      expect(response.body).toHaveProperty('_id')
      expect(response.body.message).toBe(thoughtData.message)
      expect(response.body.category).toBe(thoughtData.category)
      expect(response.body).toHaveProperty('owner')
      expect(response.body.owner.email).toBe('user1@test.com')
      expect(response.body.hearts).toBe(0)
      expect(response.body.likedBy).toEqual([])
      
      // Store thought ID for later tests
      thoughtId = response.body._id
    })

    it('should return 401 for request without token', async () => {
      const thoughtData = {
        message: 'This should fail without token'
      }

      const response = await request(app)
        .post('/thoughts')
        .send(thoughtData)
        .expect(401)

      expect(response.body.error).toBe('Unauthorized')
      expect(response.body.details).toBe('Access token is required')
    })

    it('should return 401 for invalid token', async () => {
      const thoughtData = {
        message: 'This should fail with invalid token'
      }

      const response = await request(app)
        .post('/thoughts')
        .set('Authorization', 'Bearer invalid-token')
        .send(thoughtData)
        .expect(401)

      expect(response.body.error).toBe('Unauthorized')
      expect(response.body.details).toBe('Invalid access token')
    })

    it('should return 422 for invalid message length', async () => {
      const response = await request(app)
        .post('/thoughts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ message: 'Hi' })
        .expect(422)

      expect(response.body.error).toBe('Validation Error')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'message',
            message: 'Message must be between 5 and 140 characters'
          })
        ])
      )
    })
  })

  describe('PUT /thoughts/:id - Update Thought', () => {
    beforeAll(async () => {
      // Create a thought by user2 for testing ownership
      const response = await request(app)
        .post('/thoughts')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          message: 'This is user2 thought for testing ownership',
          category: 'General'
        })
      user2ThoughtId = response.body._id
    })

    it('should update own thought with valid data', async () => {
      const updateData = {
        message: 'This is an updated test thought message'
      }

      const response = await request(app)
        .put(`/thoughts/${thoughtId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body._id).toBe(thoughtId)
      expect(response.body.message).toBe(updateData.message)
      expect(response.body.owner.email).toBe('user1@test.com')
    })

    it('should return 403 when trying to update another user\'s thought', async () => {
      const updateData = {
        message: 'Trying to hack another users thought'
      }

      const response = await request(app)
        .put(`/thoughts/${user2ThoughtId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403)

      expect(response.body.error).toBe('Forbidden')
      expect(response.body.details).toBe('You can only edit your own thoughts')
    })

    it('should return 401 for request without token', async () => {
      const response = await request(app)
        .put(`/thoughts/${thoughtId}`)
        .send({ message: 'This should fail without token' })
        .expect(401)

      expect(response.body.error).toBe('Unauthorized')
    })

    it('should return 404 for non-existent thought', async () => {
      const fakeId = '507f1f77bcf86cd799439011'
      
      const response = await request(app)
        .put(`/thoughts/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ message: 'Trying to update non-existent thought' })
        .expect(404)

      expect(response.body.error).toBe('Not found')
    })

    it('should return 422 for invalid message', async () => {
      const response = await request(app)
        .put(`/thoughts/${thoughtId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ message: 'Hi' })
        .expect(422)

      expect(response.body.error).toBe('Validation Error')
    })
  })

  describe('DELETE /thoughts/:id - Delete Thought', () => {
    let thoughtToDelete

    beforeEach(async () => {
      // Create a fresh thought for each delete test
      const response = await request(app)
        .post('/thoughts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          message: 'This thought will be deleted in test',
          category: 'General'
        })
      thoughtToDelete = response.body._id
    })

    it('should delete own thought successfully', async () => {
      const response = await request(app)
        .delete(`/thoughts/${thoughtToDelete}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(response.body.message).toBe('Thought deleted successfully')
      expect(response.body.deletedThought.id).toBe(thoughtToDelete)

      // Verify thought is actually deleted
      await request(app)
        .get(`/thoughts/${thoughtToDelete}`)
        .expect(404)
    })

    it('should return 403 when trying to delete another user\'s thought', async () => {
      const response = await request(app)
        .delete(`/thoughts/${user2ThoughtId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)

      expect(response.body.error).toBe('Forbidden')
      expect(response.body.details).toBe('You can only delete your own thoughts')

      // Verify thought still exists
      await request(app)
        .get(`/thoughts/${user2ThoughtId}`)
        .expect(200)
    })

    it('should return 401 for request without token', async () => {
      const response = await request(app)
        .delete(`/thoughts/${thoughtToDelete}`)
        .expect(401)

      expect(response.body.error).toBe('Unauthorized')
    })

    it('should return 404 for non-existent thought', async () => {
      const fakeId = '507f1f77bcf86cd799439011'
      
      const response = await request(app)
        .delete(`/thoughts/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404)

      expect(response.body.error).toBe('Not found')
    })

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .delete(`/thoughts/${thoughtToDelete}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body.error).toBe('Unauthorized')
      expect(response.body.details).toBe('Invalid access token')
    })
  })

  describe('POST /thoughts/:id/like - Like Toggle', () => {
    it('should like a thought successfully', async () => {
      const response = await request(app)
        .post(`/thoughts/${user2ThoughtId}/like`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(response.body._id).toBe(user2ThoughtId)
      expect(response.body.hearts).toBe(1)
      expect(response.body.likedBy).toContain(expect.any(String))
    })

    it('should unlike a previously liked thought (idempotent)', async () => {
      // First like
      await request(app)
        .post(`/thoughts/${user2ThoughtId}/like`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      // Then unlike
      const response = await request(app)
        .post(`/thoughts/${user2ThoughtId}/like`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(response.body._id).toBe(user2ThoughtId)
      expect(response.body.hearts).toBe(0)
      expect(response.body.likedBy).not.toContain(expect.any(String))
    })

    it('should return 401 for request without token', async () => {
      const response = await request(app)
        .post(`/thoughts/${user2ThoughtId}/like`)
        .expect(401)

      expect(response.body.error).toBe('Unauthorized')
    })

    it('should return 404 for non-existent thought', async () => {
      const fakeId = '507f1f77bcf86cd799439011'
      
      const response = await request(app)
        .post(`/thoughts/${fakeId}/like`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404)

      expect(response.body.error).toBe('Not found')
    })
  })
}) 