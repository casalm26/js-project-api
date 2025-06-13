import express from 'express'
import listEndpoints from 'express-list-endpoints'

const router = express.Router()

const getApiDocumentation = (req, res) => {
  const endpoints = listEndpoints(req.app)
  res.json(endpoints)
}

router.get('/', getApiDocumentation)

export default router
