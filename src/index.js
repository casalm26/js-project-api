import express from 'express'
import listEndpoints from 'express-list-endpoints'

const router = express.Router()

/**
 * API documentation endpoint handler
 * Lists all available endpoints in the application
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 */
const getApiDocumentation = (req, res) => {
  const endpoints = listEndpoints(req.app)
  res.json(endpoints)
}

// GET / - API documentation using express-list-endpoints
router.get('/', getApiDocumentation)

/**
 * Router for index/root endpoints
 */
export default router
