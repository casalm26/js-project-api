import express from "express"
import listEndpoints from "express-list-endpoints"

const router = express.Router()

// GET / - API documentation using express-list-endpoints
router.get("/", (req, res) => {
  // We need access to the main app to list all endpoints
  // This will be handled by passing the app instance
  const endpoints = listEndpoints(req.app)
  res.json(endpoints)
})

export default router 