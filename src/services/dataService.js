import fs from 'fs'
import path from 'path'

// Cache for thoughts data to avoid repeated file reads
let thoughtsCache = null

/**
 * Loads thoughts data from JSON file with caching
 * @returns {Array} Array of thought objects
 * @throws {Error} If file cannot be read or parsed
 */
export const loadThoughtsData = () => {
  if (!thoughtsCache) {
    try {
      const filePath = path.join(process.cwd(), 'data', 'thoughts.json')
      const fileContent = fs.readFileSync(filePath, 'utf8')
      thoughtsCache = JSON.parse(fileContent)
    } catch (error) {
      console.error('Failed to load thoughts data:', error.message)
      throw new Error('Unable to load thoughts data')
    }
  }
  return thoughtsCache
}

/**
 * Gets all thoughts from the data source
 * @returns {Array} Array of thought objects
 */
export const getThoughts = () => {
  return loadThoughtsData()
}

/**
 * Finds a thought by its ID
 * @param {string} id - The thought ID to search for
 * @returns {Object|undefined} The thought object if found, undefined otherwise
 */
export const getThoughtById = (id) => {
  const thoughts = getThoughts()
  return thoughts.find((thought) => thought._id === id)
}
