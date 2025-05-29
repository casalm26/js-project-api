import cors from "cors"
import express from "express"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"
import listEndpoints from "express-list-endpoints"

// Load environment variables from .env file
dotenv.config()

// Load dataset from JSON file and store in memory
const thoughtsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'thoughts.json'), 'utf8'))

// Defines the port the app will run on. Defaults to 8080, but can be overridden
// when starting the server. Example command to overwrite PORT env variable value:
// PORT=9000 npm start
const port = process.env.PORT || 8080
const app = express()

// Add middlewares to enable cors and json body parsing
app.use(cors())
app.use(express.json())

// Start defining your routes here
app.get("/", (req, res) => {
  res.json(listEndpoints(app))
})

// GET /thoughts - return full array of thoughts
app.get("/thoughts", (req, res) => {
  const { page, limit, category } = req.query
  
  // Start with all thoughts
  let filteredThoughts = thoughtsData
  
  // Filter by category if specified
  if (category) {
    filteredThoughts = filteredThoughts.filter(thought => 
      thought.category && thought.category.toLowerCase() === category.toLowerCase()
    )
  }
  
  // Apply pagination if specified
  if (page || limit) {
    const pageNum = parseInt(page) || 1
    const limitNum = parseInt(limit) || 20
    const startIndex = (pageNum - 1) * limitNum
    const endIndex = startIndex + limitNum
    
    filteredThoughts = filteredThoughts.slice(startIndex, endIndex)
  }
  
  res.json(filteredThoughts)
})

// GET /thoughts/:id - return single thought by ID
app.get("/thoughts/:id", (req, res) => {
  const { id } = req.params
  const thought = thoughtsData.find(thought => thought._id === id)
  
  if (thought) {
    res.json(thought)
  } else {
    res.status(404).json({ "error": "Not found" })
  }
})

// Catch-all 404 route for unknown paths
app.use("*", (req, res) => {
  res.status(404).json({ "error": "Endpoint not found" })
})

// Global error-handling middleware
app.use((err, req, res, _next) => {
  console.error(err.stack)
  res.status(500).json({ 
    error: "Internal Server Error", 
    details: err.message 
  })
})

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
