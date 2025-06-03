import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import Thought from '../models/Thought.js'

// Load environment variables
dotenv.config()

const seedThoughts = async () => {
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/happy-thoughts'
    console.log('Connecting to MongoDB...')
    await mongoose.connect(mongoUrl)
    console.log('Connected to MongoDB successfully')

    // Read thoughts from JSON file
    const thoughtsPath = path.join(process.cwd(), 'data', 'thoughts.json')
    const thoughtsData = JSON.parse(fs.readFileSync(thoughtsPath, 'utf8'))
    console.log(`Found ${thoughtsData.length} thoughts in JSON file`)

    // Check if thoughts already exist
    const existingCount = await Thought.countDocuments()
    if (existingCount > 0) {
      console.log(`Database already contains ${existingCount} thoughts`)
      console.log('Clearing existing thoughts before re-seeding...')
      await Thought.deleteMany({})
      console.log('Cleared existing thoughts')
    }

    // Transform JSON data to match our Thought model
    const transformedThoughts = thoughtsData.map(thought => ({
      message: thought.message,
      hearts: thought.hearts || 0,
      category: thought.category,
      owner: null, // All seed thoughts are anonymous (no owner)
      likedBy: [], // Start with no likes
      createdAt: thought.createdAt ? new Date(thought.createdAt) : new Date()
    }))

    // Insert thoughts into database
    console.log('Inserting thoughts into database...')
    const insertedThoughts = await Thought.insertMany(transformedThoughts)
    console.log(`Successfully inserted ${insertedThoughts.length} thoughts`)

    // Verify insertion and show some stats
    const totalCount = await Thought.countDocuments()
    const categoryCounts = await Thought.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])

    console.log(`\n✅ Migration completed successfully!`)
    console.log(`📊 Database statistics:`)
    console.log(`   Total thoughts: ${totalCount}`)
    console.log(`   Categories:`)
    categoryCounts.forEach(cat => {
      console.log(`     ${cat._id}: ${cat.count} thoughts`)
    })

  } catch (error) {
    console.error('❌ Error during migration:', error)
    
    if (error.name === 'ValidationError') {
      console.error('Validation errors:')
      Object.keys(error.errors).forEach(key => {
        console.error(`  ${key}: ${error.errors[key].message}`)
      })
    }
  } finally {
    // Close database connection
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the migration script
console.log('🌱 Happy Thoughts Migration Script')
console.log('==================================')
seedThoughts() 