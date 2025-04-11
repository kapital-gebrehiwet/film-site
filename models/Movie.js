import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
  tmdbId: {
    type: Number,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  originalTitle: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  posterPath: {
    type: String,
    required: true
  },
  backdropPath: {
    type: String,
    default: null
  },
  releaseDate: {
    type: String,
    required: true
  },
  voteAverage: {
    type: Number,
    required: true
  },
  genres: {
    type: [String],
    required: true
  },
  runtime: {
    type: Number,
    required: true
  },
  videoUrl: {
    type: String,
    required: true
  },
  trailerUrl: {
    type: String,
    default: null
  },
  videoQuality: {
    type: String,
    enum: ['HD', 'Full HD', '4K', '8K'],
    default: 'HD'
  },
  videoFormat: {
    type: String,
    enum: ['mp4', 'mkv', 'webm'],
    default: 'mp4'
  },
  videoSize: {
    type: Number, 
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  fee: {
    type: Number,
    required: true,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Movie = mongoose.models.Movie || mongoose.model('Movie', movieSchema);

export default Movie; 