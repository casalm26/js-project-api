import fs from "fs"
import path from "path"

// Load and cache the thoughts data
let thoughtsData = null

export const loadThoughtsData = () => {
  if (!thoughtsData) {
    thoughtsData = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data', 'thoughts.json'), 'utf8')
    )
  }
  return thoughtsData
}

export const getThoughts = () => {
  return loadThoughtsData()
}

export const getThoughtById = (id) => {
  const thoughts = getThoughts()
  return thoughts.find(thought => thought._id === id)
} 