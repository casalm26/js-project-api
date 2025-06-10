export const filterThoughts = (thoughts, { category }) => {
  if (!thoughts || !category) return thoughts || []

  return thoughts.filter((thought) =>
    thought.category?.toLowerCase() === category.toLowerCase()
  )
}

export const sortThoughts = (thoughts, sortParam) => {
  if (!thoughts || !sortParam) return thoughts || []

  const isDescending = sortParam.startsWith('-')
  const field = isDescending ? sortParam.slice(1) : sortParam

  return [...thoughts].sort((a, b) => {
    const valueA = field === 'createdAt' ? new Date(a[field]) : a[field]
    const valueB = field === 'createdAt' ? new Date(b[field]) : b[field]

    const comparison = valueA > valueB ? 1 : valueA < valueB ? -1 : 0
    return isDescending ? -comparison : comparison
  })
}

export const paginateThoughts = (thoughts, { page, limit }) => {
  if (!thoughts) return []
  if (!page && !limit) return thoughts

  const currentPage = Math.max(1, parseInt(page) || 1)
  const itemsPerPage = Math.max(1, parseInt(limit) || 20)
  const startIndex = (currentPage - 1) * itemsPerPage

  return thoughts.slice(startIndex, startIndex + itemsPerPage)
}
