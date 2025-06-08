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

describe('Integration Tests', () => {
  let app
  let user1Token
  let user2Token
  let user3Token
  let thoughtId

  beforeAll(async () => {
    app = createTestApp()
    
    // Create multiple test users
    const user1Response = await request(app)
      .post('/auth/signup')
      .send({
        email: 'user1@integration.test',
        password: 'Password123',
        name: 'User One'
      })
    user1Token = user1Response.body.accessToken

    const user2Response = await request(app)
      .post('/auth/signup')
      .send({
        email: 'user2@integration.test',
        password: 'Password123',
        name: 'User Two'
      })
    user2Token = user2Response.body.accessToken

    const user3Response = await request(app)
      .post('/auth/signup')
      .send({
        email: 'user3@integration.test',
        password: 'Password123',
        name: 'User Three'
      })
    user3Token = user3Response.body.accessToken

    // Create a test thought for like testing
    const thoughtResponse = await request(app)
      .post('/thoughts')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        message: 'This thought will be liked and unliked multiple times',
        category: 'General'
      })
    thoughtId = thoughtResponse.body._id
  })

  describe('Like Toggle Idempotency Tests', () => {
    it('should handle single user liking and unliking thought multiple times', async () => {
      // Initial state - no likes
      let response = await request(app)
        .get(`/thoughts/${thoughtId}`)
        .expect(200)
      
      expect(response.body.hearts).toBe(0)
      expect(response.body.likedBy).toEqual([])

      // First like
      response = await request(app)
        .post(`/thoughts/${thoughtId}/like`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)
      
      expect(response.body.hearts).toBe(1)
      expect(response.body.likedBy).toHaveLength(1)

      // Second like (should unlike)
      response = await request(app)
        .post(`/thoughts/${thoughtId}/like`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)
      
      expect(response.body.hearts).toBe(0)
      expect(response.body.likedBy).toEqual([])

      // Third like (should like again)
      response = await request(app)
        .post(`/thoughts/${thoughtId}/like`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)
      
      expect(response.body.hearts).toBe(1)
      expect(response.body.likedBy).toHaveLength(1)

      // Fourth like (should unlike again)
      response = await request(app)
        .post(`/thoughts/${thoughtId}/like`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)
      
      expect(response.body.hearts).toBe(0)
      expect(response.body.likedBy).toEqual([])
    })

    it('should handle multiple users liking the same thought', async () => {
      // Reset to clean state
      let response = await request(app)
        .get(`/thoughts/${thoughtId}`)
        .expect(200)
      
      expect(response.body.hearts).toBe(0)

      // User 1 likes
      response = await request(app)
        .post(`/thoughts/${thoughtId}/like`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)
      
      expect(response.body.hearts).toBe(1)
      expect(response.body.likedBy).toHaveLength(1)

      // User 2 likes
      response = await request(app)
        .post(`/thoughts/${thoughtId}/like`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)
      
      expect(response.body.hearts).toBe(2)
      expect(response.body.likedBy).toHaveLength(2)

      // User 3 likes
      response = await request(app)
        .post(`/thoughts/${thoughtId}/like`)
        .set('Authorization', `Bearer ${user3Token}`)
        .expect(200)
      
      expect(response.body.hearts).toBe(3)
      expect(response.body.likedBy).toHaveLength(3)

      // User 2 unlikes
      response = await request(app)
        .post(`/thoughts/${thoughtId}/like`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)
      
      expect(response.body.hearts).toBe(2)
      expect(response.body.likedBy).toHaveLength(2)

      // Verify User 1 and User 3 still have likes
      response = await request(app)
        .get(`/thoughts/${thoughtId}`)
        .expect(200)
      
      expect(response.body.hearts).toBe(2)
      expect(response.body.likedBy).toHaveLength(2)
    })

    it('should handle concurrent like requests from same user', async () => {
      // Reset to clean state
      await request(app)
        .post(`/thoughts/${thoughtId}/like`)
        .set('Authorization', `Bearer ${user1Token}`)

      await request(app)
        .post(`/thoughts/${thoughtId}/like`)
        .set('Authorization', `Bearer ${user2Token}`)

      await request(app)
        .post(`/thoughts/${thoughtId}/like`)
        .set('Authorization', `Bearer ${user3Token}`)

      // Clear all likes first
      await request(app)
        .post(`/thoughts/${thoughtId}/like`)
        .set('Authorization', `Bearer ${user1Token}`)
      
      await request(app)
        .post(`/thoughts/${thoughtId}/like`)
        .set('Authorization', `Bearer ${user2Token}`)
      
      await request(app)
        .post(`/thoughts/${thoughtId}/like`)
        .set('Authorization', `Bearer ${user3Token}`)

      // Make multiple concurrent like requests from same user
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post(`/thoughts/${thoughtId}/like`)
          .set('Authorization', `Bearer ${user1Token}`)
      )

      const responses = await Promise.all(promises)
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Final state should be consistent (either liked or not liked, not multiple)
      const finalResponse = await request(app)
        .get(`/thoughts/${thoughtId}`)
        .expect(200)
      
      expect(finalResponse.body.hearts).toBeLessThanOrEqual(1)
      expect(finalResponse.body.likedBy.length).toBeLessThanOrEqual(1)
    })
  })

  describe('End-to-End User Journey Tests', () => {
    it('should support complete user journey: signup -> create thought -> like others -> edit own -> delete own', async () => {
      // Step 1: New user signup
      const newUserResponse = await request(app)
        .post('/auth/signup')
        .send({
          email: 'journey@test.com',
          password: 'Password123',
          name: 'Journey User'
        })
        .expect(201)
      
      const journeyToken = newUserResponse.body.accessToken
      expect(newUserResponse.body.user.email).toBe('journey@test.com')

      // Step 2: Create a thought
      const createResponse = await request(app)
        .post('/thoughts')
        .set('Authorization', `Bearer ${journeyToken}`)
        .send({
          message: 'My first thought in this journey test',
          category: 'General'
        })
        .expect(201)
      
      const ownThoughtId = createResponse.body._id
      expect(createResponse.body.owner.email).toBe('journey@test.com')

      // Step 3: Like someone else's thought
      await request(app)
        .post(`/thoughts/${thoughtId}/like`)
        .set('Authorization', `Bearer ${journeyToken}`)
        .expect(200)

      // Step 4: Edit own thought
      const editResponse = await request(app)
        .put(`/thoughts/${ownThoughtId}`)
        .set('Authorization', `Bearer ${journeyToken}`)
        .send({
          message: 'My updated first thought in this journey test'
        })
        .expect(200)
      
      expect(editResponse.body.message).toBe('My updated first thought in this journey test')

      // Step 5: Try to edit someone else's thought (should fail)
      await request(app)
        .put(`/thoughts/${thoughtId}`)
        .set('Authorization', `Bearer ${journeyToken}`)
        .send({
          message: 'Trying to hack someone elses thought'
        })
        .expect(403)

      // Step 6: Delete own thought
      const deleteResponse = await request(app)
        .delete(`/thoughts/${ownThoughtId}`)
        .set('Authorization', `Bearer ${journeyToken}`)
        .expect(200)
      
      expect(deleteResponse.body.message).toBe('Thought deleted successfully')

      // Step 7: Verify thought is deleted
      await request(app)
        .get(`/thoughts/${ownThoughtId}`)
        .expect(404)
    })

    it('should handle rapid thought creation and deletion', async () => {
      const thoughtIds = []

      // Rapidly create 10 thoughts
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/thoughts')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            message: `Rapid thought number ${i + 1} for stress testing`,
            category: 'General'
          })
          .expect(201)
        
        thoughtIds.push(response.body._id)
      }

      // Verify all thoughts exist
      for (const id of thoughtIds) {
        await request(app)
          .get(`/thoughts/${id}`)
          .expect(200)
      }

      // Rapidly delete all thoughts
      for (const id of thoughtIds) {
        await request(app)
          .delete(`/thoughts/${id}`)
          .set('Authorization', `Bearer ${user1Token}`)
          .expect(200)
      }

      // Verify all thoughts are deleted
      for (const id of thoughtIds) {
        await request(app)
          .get(`/thoughts/${id}`)
          .expect(404)
      }
    })
  })

  describe('Data Consistency Tests', () => {
    it('should maintain data consistency across multiple operations', async () => {
      // Create a thought
      const thoughtResponse = await request(app)
        .post('/thoughts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          message: 'Consistency test thought',
          category: 'General'
        })
        .expect(201)
      
      const testThoughtId = thoughtResponse.body._id

      // Multiple users like the thought
      await request(app)
        .post(`/thoughts/${testThoughtId}/like`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)

      await request(app)
        .post(`/thoughts/${testThoughtId}/like`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)

      // Get thought and verify likes
      let response = await request(app)
        .get(`/thoughts/${testThoughtId}`)
        .expect(200)
      
      expect(response.body.hearts).toBe(2)
      expect(response.body.likedBy).toHaveLength(2)

      // Owner edits the thought
      response = await request(app)
        .put(`/thoughts/${testThoughtId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          message: 'Updated consistency test thought'
        })
        .expect(200)

      // Verify likes are preserved after edit
      expect(response.body.hearts).toBe(2)
      expect(response.body.likedBy).toHaveLength(2)
      expect(response.body.message).toBe('Updated consistency test thought')

      // One user unlikes
      await request(app)
        .post(`/thoughts/${testThoughtId}/like`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)

      // Verify final state
      response = await request(app)
        .get(`/thoughts/${testThoughtId}`)
        .expect(200)
      
      expect(response.body.hearts).toBe(1)
      expect(response.body.likedBy).toHaveLength(1)
    })
  })
}) 