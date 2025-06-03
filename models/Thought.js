import mongoose from 'mongoose'

const thoughtSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    minlength: [5, 'Message must be at least 5 characters long'],
    maxlength: [140, 'Message cannot exceed 140 characters']
  },
  hearts: {
    type: Number,
    default: 0,
    min: [0, 'Hearts cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['Travel', 'Family', 'Food', 'Health', 'Friends', 'Humor', 'Entertainment', 'Weather', 'Animals', 'General'],
      message: 'Category must be one of the predefined values'
    }
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Allows for anonymous thoughts (owner = null)
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true // Adds createdAt and updatedAt fields
})

// Virtual for likes count based on likedBy array length
thoughtSchema.virtual('likesCount').get(function() {
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
thoughtSchema.methods.toggleLike = function(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId)
  const isLiked = this.likedBy.includes(userObjectId)
  
  if (isLiked) {
    // Unlike: remove user from likedBy array
    this.likedBy = this.likedBy.filter(id => !id.equals(userObjectId))
    this.hearts = Math.max(0, this.hearts - 1) // Ensure hearts don't go negative
  } else {
    // Like: add user to likedBy array
    this.likedBy.push(userObjectId)
    this.hearts += 1
  }
  
  return this.save()
}

// Static method to find thoughts by category
thoughtSchema.statics.findByCategory = function(category) {
  return this.find({ category: new RegExp(category, 'i') })
}

// Pre-save middleware to ensure hearts matches likedBy length
thoughtSchema.pre('save', function(next) {
  // Sync hearts count with likedBy array length
  this.hearts = this.likedBy ? this.likedBy.length : 0
  next()
})

const Thought = mongoose.model('Thought', thoughtSchema)

export default Thought 