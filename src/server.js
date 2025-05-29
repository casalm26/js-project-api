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
  const { page, limit, category, sort } = req.query
  
  // Validate query parameters
  const errors = []
  
  // Validate page parameter
  if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
    errors.push("page must be a positive integer")
  }
  
  // Validate limit parameter
  if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    errors.push("limit must be a positive integer between 1 and 100")
  }
  
  // Validate sort parameter
  if (sort) {
    const validSortFields = ['hearts', 'createdAt', '_id', 'message']
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort
    if (!validSortFields.includes(sortField)) {
      errors.push(`sort field must be one of: ${validSortFields.join(', ')} (use - prefix for descending order)`)
    }
  }
  
  // Return validation errors if any
  if (errors.length > 0) {
    return res.status(400).json({ 
      error: "Bad query parameters", 
      details: errors 
    })
  }
  
  // Start with all thoughts
  let filteredThoughts = thoughtsData
  
  // Filter by category if specified
  if (category) {
    filteredThoughts = filteredThoughts.filter(thought => 
      thought.category && thought.category.toLowerCase() === category.toLowerCase()
    )
  }
  
  // Apply sorting if specified
  if (sort) {
    const isDescending = sort.startsWith('-')
    const sortField = isDescending ? sort.substring(1) : sort
    
    filteredThoughts = filteredThoughts.sort((a, b) => {
      let valueA = a[sortField]
      let valueB = b[sortField]
      
      // Handle date sorting
      if (sortField === 'createdAt') {
        valueA = new Date(valueA)
        valueB = new Date(valueB)
      }
      
      if (isDescending) {
        return valueB > valueA ? 1 : valueB < valueA ? -1 : 0
      } else {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0
      }
    })
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
  
  // Validate ID format (basic check for empty or whitespace-only)
  if (!id || id.trim() === '') {
    return res.status(400).json({ 
      error: "Bad request", 
      details: "ID parameter cannot be empty" 
    })
  }
  
  const thought = thoughtsData.find(thought => thought._id === id)
  
  if (thought) {
    res.json(thought)
  } else {
    res.status(404).json({ 
      error: "Not found",
      details: `Thought with ID '${id}' does not exist`
    })
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
