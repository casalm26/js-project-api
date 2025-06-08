export const validateThoughtsQuery = (req, res, next) => {
  const { page, limit, sort, category, minHearts, newerThan } = req.query
  const errors = []
  
  // Validate page parameter
  if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
    errors.push("page must be a positive integer")
  }
  
  // Validate limit parameter
  if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    errors.push("limit must be a positive integer between 1 and 100")
  }
  
  // Validate sort parameter - STRETCH-04: Enhanced sorting options
  if (sort) {
    const validSortFields = ['hearts', 'createdAt', 'updatedAt', 'category', '_id', 'message']
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort
    if (!validSortFields.includes(sortField)) {
      errors.push(`sort field must be one of: ${validSortFields.join(', ')} (use - prefix for descending order)`)
    }
  }
  
  // STRETCH-03: Validate category parameter (flexible - allow any string for filtering)
  if (category && category.trim().length === 0) {
    errors.push("category cannot be empty")
  }
  
  // STRETCH-04: Validate minHearts parameter
  if (minHearts && (isNaN(parseInt(minHearts)) || parseInt(minHearts) < 0)) {
    errors.push("minHearts must be a non-negative integer")
  }
  
  // STRETCH-04: Validate newerThan parameter
  if (newerThan) {
    const date = new Date(newerThan)
    if (isNaN(date.getTime())) {
      errors.push("newerThan must be a valid date (ISO 8601 format recommended, e.g., 2024-01-01T00:00:00Z)")
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