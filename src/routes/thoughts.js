import express from 'express'
import Thought from '../models/Thought.js'
import {
  validateThoughtsQuery,
  validateThoughtId,
  thoughtValidation,
} from '../middleware/validation.js'
import { authenticateToken } from '../middleware/authMiddleware.js'
import { thoughtCreationRateLimit } from '../middleware/rateLimiting.js'

const router = express.Router()

const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'hearts', 'category']

const createErrorResponse = (status, error, details) => ({
  status,
  json: { error, details },
})

const handleCastError = () =>
  createErrorResponse(400, 'Bad Request', 'Invalid thought ID format')

const handleServerError = (action) =>
  createErrorResponse(500, 'Internal Server Error', `Failed to ${action}`)

const buildFilterQuery = ({ category, minHearts, newerThan }) => {
  const query = {}

  if (category) {
    query.category = new RegExp(category, 'i')
  }

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

  return query
}

const buildSortObject = (sort) => {
  if (!sort) return { createdAt: -1 }

  const isDescending = sort.startsWith('-')
  const sortField = isDescending ? sort.substring(1) : sort

  if (!ALLOWED_SORT_FIELDS.includes(sortField)) {
    return { createdAt: -1 }
  }

  return { [sortField]: isDescending ? -1 : 1 }
}

const calculatePagination = (page, limit) => {
  const pageNum = parseInt(page) || 1
  const limitNum = parseInt(limit) || 20
  const skip = (pageNum - 1) * limitNum

  return { pageNum, limitNum, skip }
}

const createPaginationMetadata = (pageNum, totalCount, limitNum) => {
  const totalPages = Math.ceil(totalCount / limitNum)
  return {
    currentPage: pageNum,
    totalPages,
    totalCount,
    hasNextPage: pageNum < totalPages,
    hasPrevPage: pageNum > 1,
  }
}

const checkOwnership = (thought, userId) => {
  if (!thought.owner || thought.owner.toString() !== userId.toString()) {
    return false
  }
  return true
}

const conditionalAuth = (req, res, next) => {
  const { allowAnonymous } = req.query

  if (allowAnonymous === 'true') {
    req.user = null
    next()
  } else {
    authenticateToken(req, res, next)
  }
}

router.get('/', validateThoughtsQuery, async (req, res) => {
  try {
    const { page, limit, category, sort, minHearts, newerThan } = req.query

    const query = buildFilterQuery({ category, minHearts, newerThan })
    const sortObj = buildSortObject(sort)
    const { pageNum, limitNum, skip } = calculatePagination(page, limit)

    const thoughts = await Thought.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate('owner', 'name email')
      .exec()

    const totalCount = await Thought.countDocuments(query)
    const pagination = createPaginationMetadata(pageNum, totalCount, limitNum)

    res.status(200).json({
      thoughts,
      pagination,
      filters: { category, minHearts, newerThan, sort },
    })
  } catch {
    const errorResponse = handleServerError('fetch thoughts')
    res.status(errorResponse.status).json(errorResponse.json)
  }
})

router.post(
  '/',
  thoughtCreationRateLimit,
  thoughtValidation,
  conditionalAuth,
  async (req, res) => {
    try {
      const { message, category = 'General' } = req.body
      const { allowAnonymous } = req.query

      if (!message || message.trim().length === 0) {
        const errorResponse = createErrorResponse(
          400,
          'Bad Request',
          'Message is required'
        )
        return res.status(errorResponse.status).json(errorResponse.json)
      }

      const owner = allowAnonymous === 'true' ? null : req.user.userId

      const thoughtData = {
        message: message.trim(),
        category,
        owner,
        hearts: 0,
        likedBy: [],
      }

      const newThought = new Thought(thoughtData)
      const savedThought = await newThought.save()

      const populatedThought = await Thought.findById(savedThought._id)
        .populate('owner', 'name email')
        .exec()

      res.status(201).json(populatedThought)
    } catch (error) {
      if (error.name === 'UnauthorizedError' || error.message?.includes('token')) {
        const errorResponse = createErrorResponse(
          401,
          'Unauthorized',
          'Authentication required. Use ?allowAnonymous=true for anonymous posting.'
        )
        return res.status(errorResponse.status).json(errorResponse.json)
      }

      if (error.name === 'ValidationError') {
        const errorResponse = createErrorResponse(
          422,
          'Validation Error',
          Object.values(error.errors).map((e) => e.message)
        )
        return res.status(errorResponse.status).json(errorResponse.json)
      }

      const errorResponse = handleServerError('create thought')
      res.status(errorResponse.status).json(errorResponse.json)
    }
  }
)

router.get('/:id', validateThoughtId, async (req, res) => {
  try {
    const { id } = req.params

    const thought = await Thought.findById(id)
      .populate('owner', 'name email')
      .exec()

    if (!thought) {
      const errorResponse = createErrorResponse(
        404,
        'Not found',
        `Thought with ID '${id}' does not exist`
      )
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    res.status(200).json(thought)
  } catch (error) {
    if (error.name === 'CastError') {
      const errorResponse = handleCastError()
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    const errorResponse = handleServerError('fetch thought')
    res.status(errorResponse.status).json(errorResponse.json)
  }
})

router.post('/:id/like', authenticateToken, validateThoughtId, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const thought = await Thought.findById(id)

    if (!thought) {
      const errorResponse = createErrorResponse(
        404,
        'Not found',
        `Thought with ID '${id}' does not exist`
      )
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    const hasLiked = thought.likedBy.some(id => id.toString() === userId.toString())

    const updateOperation = hasLiked
      ? { $pull: { likedBy: userId }, $inc: { hearts: -1 } }
      : { $addToSet: { likedBy: userId }, $inc: { hearts: 1 } }

    const updatedThought = await Thought.findByIdAndUpdate(id, updateOperation, {
      new: true,
    }).populate('owner', 'name email')

    res.status(200).json(updatedThought)
  } catch (error) {
    if (error.name === 'CastError') {
      const errorResponse = handleCastError()
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    const errorResponse = handleServerError('toggle like')
    res.status(errorResponse.status).json(errorResponse.json)
  }
})

router.put('/:id', authenticateToken, validateThoughtId, async (req, res) => {
  try {
    const { id } = req.params
    const { message } = req.body
    const userId = req.user.userId

    if (!message || message.trim().length === 0) {
      const errorResponse = createErrorResponse(
        400,
        'Bad Request',
        'Message is required'
      )
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    const thought = await Thought.findById(id)

    if (!thought) {
      const errorResponse = createErrorResponse(
        404,
        'Not found',
        `Thought with ID '${id}' does not exist`
      )
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    if (!checkOwnership(thought, userId)) {
      const errorResponse = createErrorResponse(
        403,
        'Forbidden',
        'You can only edit your own thoughts'
      )
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    const updatedThought = await Thought.findByIdAndUpdate(
      id,
      { message: message.trim(), updatedAt: new Date() },
      { new: true }
    ).populate('owner', 'name email')

    res.status(200).json(updatedThought)
  } catch (error) {
    if (error.name === 'CastError') {
      const errorResponse = handleCastError()
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    if (error.name === 'ValidationError') {
      const errorResponse = createErrorResponse(
        422,
        'Validation Error',
        Object.values(error.errors).map((e) => e.message)
      )
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    const errorResponse = handleServerError('update thought')
    res.status(errorResponse.status).json(errorResponse.json)
  }
})

router.delete('/:id', authenticateToken, validateThoughtId, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const thought = await Thought.findById(id)

    if (!thought) {
      const errorResponse = createErrorResponse(
        404,
        'Not found',
        `Thought with ID '${id}' does not exist`
      )
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    if (!checkOwnership(thought, userId)) {
      const errorResponse = createErrorResponse(
        403,
        'Forbidden',
        'You can only delete your own thoughts'
      )
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    await Thought.findByIdAndDelete(id)

    res.status(200).json({
      message: 'Thought deleted successfully',
      deletedThought: { id: thought._id, message: thought.message },
    })
  } catch (error) {
    if (error.name === 'CastError') {
      const errorResponse = handleCastError()
      return res.status(errorResponse.status).json(errorResponse.json)
    }

    const errorResponse = handleServerError('delete thought')
    res.status(errorResponse.status).json(errorResponse.json)
  }
})

export default router
