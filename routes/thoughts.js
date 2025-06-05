import express from "express"
import Thought from "../models/Thought.js"
import { validateThoughtsQuery, validateThoughtId } from "../src/middleware/validation.js"
import { authenticateToken } from "../middleware/authMiddleware.js"

const router = express.Router()

// GET /thoughts - return filtered, sorted, and paginated thoughts from MongoDB
router.get("/", validateThoughtsQuery, async (req, res) => {
  try {
    const { page, limit, category, sort } = req.query
    
    // Build query object for filtering
    const query = {}
    if (category) {
      query.category = new RegExp(category, 'i') // Case-insensitive search
    }
    
    // Set up pagination
    const pageNum = parseInt(page) || 1
    const limitNum = parseInt(limit) || 20
    const skip = (pageNum - 1) * limitNum
    
    // Build sort object
    let sortObj = { createdAt: -1 } // Default: newest first
    if (sort) {
      const isDescending = sort.startsWith('-')
      const sortField = isDescending ? sort.substring(1) : sort
      sortObj = { [sortField]: isDescending ? -1 : 1 }
    }
    
    // Execute query with pagination and sorting
    const thoughts = await Thought.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate('owner', 'name email') // Populate owner info if available
      .exec()
    
    // Get total count for pagination metadata
    const totalCount = await Thought.countDocuments(query)
    const totalPages = Math.ceil(totalCount / limitNum)
    
    // Return thoughts with pagination metadata
    res.status(200).json({
      thoughts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    })
    
  } catch (error) {
    console.error('Error fetching thoughts:', error)
    res.status(500).json({
      error: "Internal Server Error",
      details: "Failed to fetch thoughts"
    })
  }
})

// POST /thoughts - create a new thought (protected route)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { message, category = "General" } = req.body
    
    // Validate required fields
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        details: "Message is required"
      })
    }
    
    // Create new thought
    const thoughtData = {
      message: message.trim(),
      category,
      owner: req.user.userId, // Link to authenticated user
      hearts: 0,
      likedBy: []
    }
    
    const newThought = new Thought(thoughtData)
    const savedThought = await newThought.save()
    
    // Populate owner info and return
    const populatedThought = await Thought.findById(savedThought._id)
      .populate('owner', 'name email')
      .exec()
    
    res.status(201).json(populatedThought)
    
  } catch (error) {
    console.error('Error creating thought:', error)
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(422).json({
        error: "Validation Error",
        details: Object.values(error.errors).map(e => e.message)
      })
    }
    
    res.status(500).json({
      error: "Internal Server Error",
      details: "Failed to create thought"
    })
  }
})

// GET /thoughts/:id - return single thought by ID from MongoDB
router.get("/:id", validateThoughtId, async (req, res) => {
  try {
    const { id } = req.params
    
    const thought = await Thought.findById(id)
      .populate('owner', 'name email') // Populate owner info if available
      .exec()
    
    if (!thought) {
      return res.status(404).json({ 
        error: "Not found",
        details: `Thought with ID '${id}' does not exist`
      })
    }
    
    res.status(200).json(thought)
    
  } catch (error) {
    console.error('Error fetching thought:', error)
    
    // Handle invalid ObjectId errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: "Bad Request",
        details: "Invalid thought ID format"
      })
    }
    
    res.status(500).json({
      error: "Internal Server Error",
      details: "Failed to fetch thought"
    })
  }
})

export default router 