import express from "express"
import Thought from "../models/Thought.js"
import { validateThoughtsQuery, validateThoughtId } from "../src/middleware/validation.js"
import { thoughtValidation } from "../middleware/validation.js"
import { authenticateToken } from "../middleware/authMiddleware.js"
import { thoughtCreationRateLimit } from "../middleware/rateLimiting.js"

const router = express.Router()

// GET /thoughts - return filtered, sorted, and paginated thoughts from MongoDB
router.get("/", validateThoughtsQuery, async (req, res) => {
  try {
    const { page, limit, category, sort, minHearts, newerThan } = req.query
    
    // Build query object for filtering
    const query = {}
    if (category) {
      query.category = new RegExp(category, 'i') // Case-insensitive search
    }
    
    // STRETCH-04: Advanced filters
    if (minHearts) {
      const minHeartsNum = parseInt(minHearts)
      if (!isNaN(minHeartsNum) && minHeartsNum >= 0) {
        query.hearts = { $gte: minHeartsNum }
      }
    }
    
    if (newerThan) {
      const date = new Date(newerThan)
      if (date instanceof Date && !isNaN(date)) {
        query.createdAt = { $gte: date }
      }
    }
    
    // Set up pagination
    const pageNum = parseInt(page) || 1
    const limitNum = parseInt(limit) || 20
    const skip = (pageNum - 1) * limitNum
    
    // Build sort object - STRETCH-04: Enhanced sorting
    let sortObj = { createdAt: -1 } // Default: newest first
    if (sort) {
      const isDescending = sort.startsWith('-')
      const sortField = isDescending ? sort.substring(1) : sort
      
      // Allow sorting by different fields
      const allowedSortFields = ['createdAt', 'updatedAt', 'hearts', 'category']
      if (allowedSortFields.includes(sortField)) {
        sortObj = { [sortField]: isDescending ? -1 : 1 }
      }
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
      },
      filters: {
        category,
        minHearts,
        newerThan,
        sort
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

// Middleware to conditionally apply authentication based on allowAnonymous flag
const conditionalAuth = (req, res, next) => {
  const { allowAnonymous } = req.query
  
  if (allowAnonymous === 'true') {
    // Skip authentication for anonymous posts
    req.user = null
    next()
  } else {
    // Apply authentication middleware
    authenticateToken(req, res, next)
  }
}

// POST /thoughts - create a new thought (supports anonymous posting with allowAnonymous=true)
router.post("/", thoughtCreationRateLimit, thoughtValidation, conditionalAuth, async (req, res) => {
  try {
    const { message, category = "General" } = req.body
    const { allowAnonymous } = req.query
    
    // Validate required fields
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        details: "Message is required"
      })
    }
    
    // STRETCH-01: Handle anonymous vs authenticated posting
    const owner = (allowAnonymous === 'true') ? null : req.user.userId
    
    // Create new thought
    const thoughtData = {
      message: message.trim(),
      category,
      owner,
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
    
    // Handle authentication errors for non-anonymous posts
    if (error.name === 'UnauthorizedError' || error.message?.includes('token')) {
      return res.status(401).json({
        error: "Unauthorized",
        details: "Authentication required. Use ?allowAnonymous=true for anonymous posting."
      })
    }
    
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

// POST /thoughts/:id/like - toggle like/unlike for authenticated user (idempotent)
router.post("/:id/like", authenticateToken, validateThoughtId, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    
    const thought = await Thought.findById(id)
    
    if (!thought) {
      return res.status(404).json({
        error: "Not found",
        details: `Thought with ID '${id}' does not exist`
      })
    }
    
    // Check if user has already liked this thought
    const hasLiked = thought.likedBy.includes(userId)
    
    let updatedThought
    if (hasLiked) {
      // Unlike: remove user from likedBy array and decrement hearts
      updatedThought = await Thought.findByIdAndUpdate(
        id,
        {
          $pull: { likedBy: userId },
          $inc: { hearts: -1 }
        },
        { new: true }
      ).populate('owner', 'name email')
    } else {
      // Like: add user to likedBy array and increment hearts
      updatedThought = await Thought.findByIdAndUpdate(
        id,
        {
          $addToSet: { likedBy: userId }, // $addToSet prevents duplicates
          $inc: { hearts: 1 }
        },
        { new: true }
      ).populate('owner', 'name email')
    }
    
    res.status(200).json(updatedThought)
    
  } catch (error) {
    console.error('Error toggling like:', error)
    
    // Handle invalid ObjectId errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: "Bad Request",
        details: "Invalid thought ID format"
      })
    }
    
    res.status(500).json({
      error: "Internal Server Error",
      details: "Failed to toggle like"
    })
  }
})

// PUT /thoughts/:id - edit thought message (owner only)
router.put("/:id", authenticateToken, validateThoughtId, async (req, res) => {
  try {
    const { id } = req.params
    const { message } = req.body
    const userId = req.user.userId
    
    // Validate message
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        details: "Message is required"
      })
    }
    
    // Find the thought first to check ownership
    const thought = await Thought.findById(id)
    
    if (!thought) {
      return res.status(404).json({
        error: "Not found",
        details: `Thought with ID '${id}' does not exist`
      })
    }
    
    // Temporary debug logging for ownership verification
    console.log('Ownership Debug:');
    console.log('- thought.owner._id:', thought.owner._id);
    console.log('- userId:', userId);
    console.log('- IDs match:', thought.owner.toString() === userId);

    // Check if the authenticated user is the owner
    if (!thought.owner || thought.owner.toString() !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        details: "You can only edit your own thoughts"
      })
    }
    
    // Update the thought
    const updatedThought = await Thought.findByIdAndUpdate(
      id,
      { 
        message: message.trim(),
        updatedAt: new Date()
      },
      { new: true }
    ).populate('owner', 'name email')
    
    res.status(200).json(updatedThought)
    
  } catch (error) {
    console.error('Error updating thought:', error)
    
    // Handle invalid ObjectId errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: "Bad Request",
        details: "Invalid thought ID format"
      })
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(422).json({
        error: "Validation Error",
        details: Object.values(error.errors).map(e => e.message)
      })
    }
    
    res.status(500).json({
      error: "Internal Server Error",
      details: "Failed to update thought"
    })
  }
})

// DELETE /thoughts/:id - delete thought (owner only)
router.delete("/:id", authenticateToken, validateThoughtId, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    
    // Find the thought first to check ownership
    const thought = await Thought.findById(id)
    
    if (!thought) {
      return res.status(404).json({
        error: "Not found",
        details: `Thought with ID '${id}' does not exist`
      })
    }
    
    // Check if the authenticated user is the owner
    if (!thought.owner || thought.owner.toString() !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        details: "You can only delete your own thoughts"
      })
    }
    
    // Delete the thought
    await Thought.findByIdAndDelete(id)
    
    res.status(200).json({
      message: "Thought deleted successfully",
      deletedThought: {
        id: thought._id,
        message: thought.message
      }
    })
    
  } catch (error) {
    console.error('Error deleting thought:', error)
    
    // Handle invalid ObjectId errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: "Bad Request",
        details: "Invalid thought ID format"
      })
    }
    
    res.status(500).json({
      error: "Internal Server Error",
      details: "Failed to delete thought"
    })
  }
})

export default router 