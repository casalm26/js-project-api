export const filterThoughts = (thoughts, { category }) => {
  if (!category) return thoughts
  
  return thoughts.filter(thought => 
    thought.category && thought.category.toLowerCase() === category.toLowerCase()
  )
}

export const sortThoughts = (thoughts, sortParam) => {
  if (!sortParam) return thoughts
  
  const isDescending = sortParam.startsWith('-')
  const sortField = isDescending ? sortParam.substring(1) : sortParam
  
  return thoughts.sort((a, b) => {
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

export const paginateThoughts = (thoughts, { page, limit }) => {
  if (!page && !limit) return thoughts
  
  const pageNum = parseInt(page) || 1
  const limitNum = parseInt(limit) || 20
  const startIndex = (pageNum - 1) * limitNum
  const endIndex = startIndex + limitNum
  
  return thoughts.slice(startIndex, endIndex)
} 