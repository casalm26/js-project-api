import express from "express"
import Thought from "../models/Thought.js"
import { authenticateToken } from "../middleware/authMiddleware.js"

const router = express.Router()

// STRETCH-02: GET /users/me/likes - return thoughts liked by the authenticated user
router.get("/me/likes", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId
    const { page, limit, sort } = req.query
    
    // Set up pagination
    const pageNum = parseInt(page) || 1
    const limitNum = parseInt(limit) || 20
    const skip = (pageNum - 1) * limitNum
    
    // Build sort object
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
    
    // Find thoughts that the user has liked
    const likedThoughts = await Thought.find({ 
      likedBy: userId 
    })
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate('owner', 'name email')
      .exec()
    
    // Get total count for pagination metadata
    const totalCount = await Thought.countDocuments({ likedBy: userId })
    const totalPages = Math.ceil(totalCount / limitNum)
    
    res.status(200).json({
      likedThoughts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    })
    
  } catch (error) {
    console.error('Error fetching liked thoughts:', error)
    res.status(500).json({
      error: "Internal Server Error",
      details: "Failed to fetch liked thoughts"
    })
  }
})

// GET /users/me/thoughts - return thoughts created by the authenticated user
router.get("/me/thoughts", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId
    const { page, limit, sort } = req.query
    
    // Set up pagination
    const pageNum = parseInt(page) || 1
    const limitNum = parseInt(limit) || 20
    const skip = (pageNum - 1) * limitNum
    
    // Build sort object
    let sortObj = { createdAt: -1 } // Default: newest first
    if (sort) {
      const isDescending = sort.startsWith('-')
      const sortField = isDescending ? sort.substring(1) : sort
      
      const allowedSortFields = ['createdAt', 'updatedAt', 'hearts', 'category']
      if (allowedSortFields.includes(sortField)) {
        sortObj = { [sortField]: isDescending ? -1 : 1 }
      }
    }
    
    // Find thoughts created by the user
    const userThoughts = await Thought.find({ 
      owner: userId 
    })
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate('owner', 'name email')
      .exec()
    
    // Get total count for pagination metadata
    const totalCount = await Thought.countDocuments({ owner: userId })
    const totalPages = Math.ceil(totalCount / limitNum)
    
    res.status(200).json({
      thoughts: userThoughts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    })
    
  } catch (error) {
    console.error('Error fetching user thoughts:', error)
    res.status(500).json({
      error: "Internal Server Error",
      details: "Failed to fetch user thoughts"
    })
  }
})

export default router 