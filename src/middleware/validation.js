export const validateThoughtsQuery = (req, res, next) => {
  const { page, limit, sort } = req.query
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
  
  next()
}

export const validateThoughtId = (req, res, next) => {
  const { id } = req.params
  
  // Validate ID format (basic check for empty or whitespace-only)
  if (!id || id.trim() === '') {
    return res.status(400).json({ 
      error: "Bad request", 
      details: "ID parameter cannot be empty" 
    })
  }
  
  next()
} 