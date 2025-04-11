import mongoose from 'mongoose';

const MovieStateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  movieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true,
  },
  isLocked: {
    type: Boolean,
    default: true,
  },
  isBlurred: {
    type: Boolean,
    default: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Create a compound index for faster queries
MovieStateSchema.index({ userId: 1, movieId: 1 }, { unique: true });

// Add a pre-save middleware to update isLocked and isBlurred based on purchased movies
MovieStateSchema.pre('save', async function(next) {
  try {
    console.log('Pre-save middleware triggered');
    const User = mongoose.model('User');
    const user = await User.findById(this.userId).select('purchasedMovies');
    
    if (user) {
      console.log('User found:', user._id);
      console.log('User purchased movies:', user.purchasedMovies);
      console.log('Current movie ID:', this.movieId);
      
      const isPurchased = user.purchasedMovies.some(id => id.equals(this.movieId));
      console.log('Is movie purchased:', isPurchased);
      
      this.isLocked = !isPurchased;
      this.isBlurred = !isPurchased;
      console.log('Updated state:', { isLocked: this.isLocked, isBlurred: this.isBlurred });
    }
    
    next();
  } catch (error) {
    console.error('Pre-save middleware error:', error);
    next(error);
  }
});

export default mongoose.models.MovieState || mongoose.model('MovieState', MovieStateSchema); 