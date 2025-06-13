import express from 'express'
import Thought from '../models/Thought.js'
import { authenticateToken } from '../middleware/authMiddleware.js'
import { validateThoughtsQuery } from '../middleware/validation.js'

const router = express.Router()

const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'hearts', 'category']

const createErrorResponse = (details) => ({
  error: 'Internal Server Error',
  details,
})

const buildFilterQuery = ({ category, minHearts, newerThan, userId }) => {
  const query = { owner: userId }

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

const fetchUserThoughts = async (userId, query, sortObj, skip, limitNum) => {
  const thoughts = await Thought.find(query)
    .sort(sortObj)
    .skip(skip)
    .limit(limitNum)
    .populate('owner', 'name email')
    .exec()

  const totalCount = await Thought.countDocuments(query)
  return { thoughts, totalCount }
}

// STRETCH-02: GET /users/me/likes - return thoughts liked by the authenticated user
router.get('/me/likes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId
    const { page, limit, sort } = req.query

    const sortObj = buildSortObject(sort)
    const { pageNum, limitNum, skip } = calculatePagination(page, limit)

    const query = { likedBy: userId }
    const { thoughts, totalCount } = await fetchUserThoughts(
      userId,
      query,
      sortObj,
      skip,
      limitNum
    )

    const pagination = createPaginationMetadata(pageNum, totalCount, limitNum)

    res.status(200).json({
      likedThoughts: thoughts,
      total: totalCount,
      pagination,
    })
  } catch {
    const errorResponse = createErrorResponse('Failed to fetch liked thoughts')
    res.status(500).json(errorResponse)
  }
})

// GET /users/me/thoughts - return thoughts created by the authenticated user
router.get('/me/thoughts', validateThoughtsQuery, authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId
    const { page, limit, sort, category, minHearts, newerThan } = req.query

    const query = buildFilterQuery({ category, minHearts, newerThan, userId })
    const sortObj = buildSortObject(sort)
    const { pageNum, limitNum, skip } = calculatePagination(page, limit)

    const thoughts = await Thought.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate('owner', 'name email')
      .exec()

    const total = await Thought.countDocuments(query)
    const pagination = createPaginationMetadata(pageNum, total, limitNum)

    res.status(200).json({
      thoughts,
      total,
      pagination,
      filters: { category, minHearts, newerThan, sort },
    })
  } catch {
    const errorResponse = createErrorResponse('Failed to fetch user thoughts')
    res.status(500).json(errorResponse)
  }
})

export default router
