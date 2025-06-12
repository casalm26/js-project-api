import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Import fetch for Node.js environments
import fetch from 'node-fetch'

// Load environment variables
dotenv.config()

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080'

/**
 * Fetches thoughts data from JSON file
 * @returns {Array} Array of thought objects
 */
const loadThoughtsData = () => {
  try {
    const thoughtsPath = path.join(process.cwd(), 'data', 'thoughts.json')
    const thoughtsData = JSON.parse(fs.readFileSync(thoughtsPath, 'utf8'))
    console.log(`📖 Loaded ${thoughtsData.length} thoughts from JSON file`)
    return thoughtsData
  } catch (error) {
    console.error('❌ Error loading thoughts data:', error.message)
    process.exit(1)
  }
}

/**
 * Creates a single thought via API
 * @param {Object} thought - Thought object with message and category
 * @returns {Promise<Object>} Created thought object
 */
const createThought = async (thought) => {
  try {
    const response = await fetch(`${API_BASE_URL}/thoughts?allowAnonymous=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(thought),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorData.details || errorData.error}`)
    }

    const createdThought = await response.json()
    return createdThought
  } catch (error) {
    console.error(`❌ Failed to create thought: "${thought.message}"`)
    console.error(`   Error: ${error.message}`)
    throw error
  }
}

/**
 * Checks if API server is running
 * @returns {Promise<boolean>} True if server is accessible
 */
const checkAPIHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: 'GET',
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Gets current count of thoughts in database
 * @returns {Promise<number>} Number of existing thoughts
 */
const getExistingThoughtsCount = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/thoughts`)
    if (response.ok) {
      const data = await response.json()
      return data.pagination?.totalCount || 0
    }
    return 0
  } catch (error) {
    console.warn('⚠️  Could not get existing thoughts count:', error.message)
    return 0
  }
}

/**
 * Seeds thoughts through the API
 */
const seedThoughtsViaAPI = async () => {
  console.log('🌱 Happy Thoughts API Seeder')
  console.log('============================')

  // Check if API is running
  console.log('🔍 Checking API server status...')
  const isAPIRunning = await checkAPIHealth()
  if (!isAPIRunning) {
    console.error('❌ API server is not running or not accessible')
    console.error(`   Please make sure the server is running on ${API_BASE_URL}`)
    process.exit(1)
  }
  console.log('✅ API server is running')

  // Check existing thoughts
  const existingCount = await getExistingThoughtsCount()
  if (existingCount > 0) {
    console.log(`ℹ️  Found ${existingCount} existing thoughts in database`)
    console.log('   Proceeding to add new thoughts...')
  }

  // Load thoughts data
  const thoughtsToCreate = loadThoughtsData()

  // Create thoughts via API
  console.log('🚀 Creating thoughts via API...')
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < thoughtsToCreate.length; i++) {
    const thought = thoughtsToCreate[i]
    try {
      console.log(`   [${i + 1}/${thoughtsToCreate.length}] Creating: "${thought.message.substring(0, 50)}${thought.message.length > 50 ? '...' : ''}"`)
      
      await createThought(thought)
      successCount++
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => {
        setTimeout(resolve, 100)
      })
      
    } catch {
      errorCount++
      // Continue with next thought
    }
  }

  // Final report
  console.log('\n📊 Seeding Results:')
  console.log(`   ✅ Successfully created: ${successCount} thoughts`)
  if (errorCount > 0) {
    console.log(`   ❌ Failed to create: ${errorCount} thoughts`)
  }

  // Get final count
  const finalCount = await getExistingThoughtsCount()
  console.log(`   📈 Total thoughts in database: ${finalCount}`)

  if (errorCount === 0) {
    console.log('\n🎉 All thoughts seeded successfully!')
  } else {
    console.log('\n⚠️  Seeding completed with some errors')
  }
  
  process.exit(0)
}

// Run the seeder
seedThoughtsViaAPI().catch((error) => {
  console.error('💥 Fatal error during seeding:', error)
  process.exit(1)
}) 