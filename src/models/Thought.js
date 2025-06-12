import mongoose from 'mongoose'

// Constants for data integrity (not validation limits - those are in middleware)
const MIN_HEARTS = 0

const CATEGORIES = [
  'Travel',
  'Family',
  'Food',
  'Health',
  'Friends',
  'Humor',
  'Entertainment',
  'Weather',
  'Animals',
  'General',
]

// Helper functions
const createUserObjectId = (userId) => new mongoose.Types.ObjectId(userId)

const isUserInArray = (userArray, userId) => {
  const userObjectId = createUserObjectId(userId)
  return userArray.some((id) => id.equals(userObjectId))
}

const removeUserFromArray = (userArray, userId) => {
  const userObjectId = createUserObjectId(userId)
  return userArray.filter((id) => !id.equals(userObjectId))
}

const thoughtSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },
    hearts: {
      type: Number,
      default: 0,
      min: [MIN_HEARTS, 'Hearts cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: CATEGORIES,
        message: 'Category must be one of the predefined values',
      },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
)

// Virtual for likes count based on likedBy array length
thoughtSchema.virtual('likesCount').get(function () {
  return this.likedBy ? this.likedBy.length : 0
})

// Ensure virtual fields are serialized
thoughtSchema.set('toJSON', { virtuals: true })
thoughtSchema.set('toObject', { virtuals: true })

// Index for better performance on common queries
thoughtSchema.index({ createdAt: -1 }) // Most recent first
thoughtSchema.index({ hearts: -1 }) // Most liked first
thoughtSchema.index({ category: 1 }) // Category filtering
thoughtSchema.index({ owner: 1 }) // User's thoughts

// Instance method to toggle like from a user
thoughtSchema.methods.toggleLike = function (userId) {
  const isLiked = isUserInArray(this.likedBy, userId)

  if (isLiked) {
    this.likedBy = removeUserFromArray(this.likedBy, userId)
    this.hearts = Math.max(MIN_HEARTS, this.hearts - 1)
  } else {
    this.likedBy.push(createUserObjectId(userId))
    this.hearts += 1
  }

  return this.save()
}

// Static method to find thoughts by category
thoughtSchema.statics.findByCategory = function (category) {
  return this.find({ category: new RegExp(category, 'i') })
}

// Pre-save middleware to ensure hearts matches likedBy length
thoughtSchema.pre('save', function (next) {
  this.hearts = this.likedBy ? this.likedBy.length : 0
  next()
})

const Thought = mongoose.model('Thought', thoughtSchema)

export default Thought
