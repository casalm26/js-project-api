import express from "express"
import { getThoughts, getThoughtById } from "../services/dataService.js"
import { validateThoughtsQuery, validateThoughtId } from "../middleware/validation.js"
import { filterThoughts, sortThoughts, paginateThoughts } from "../utils/thoughtsHelper.js"

const router = express.Router()

// GET /thoughts - return filtered, sorted, and paginated thoughts
router.get("/", validateThoughtsQuery, (req, res) => {
  const { page, limit, category, sort } = req.query
  
  // Start with all thoughts
  let thoughts = getThoughts()
  
  // Apply filtering
  thoughts = filterThoughts(thoughts, { category })
  
  // Apply sorting
  thoughts = sortThoughts(thoughts, sort)
  
  // Apply pagination
  thoughts = paginateThoughts(thoughts, { page, limit })
  
  res.json(thoughts)
})

// GET /thoughts/:id - return single thought by ID
router.get("/:id", validateThoughtId, (req, res) => {
  const { id } = req.params
  const thought = getThoughtById(id)
  
  if (thought) {
    res.json(thought)
  } else {
    res.status(404).json({ 
      error: "Not found",
      details: `Thought with ID '${id}' does not exist`
    })
  }
})

export default router 