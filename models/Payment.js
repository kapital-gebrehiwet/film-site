import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'ETB',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  tx_ref: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ['movie', 'subscription'],
    required: true,
  },
  purchasedMovies: [{
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
    },
    price: Number,
    purchaseDate: {
      type: Date,
      default: Date.now,
    }
  }],
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'vip'],
    },
    startDate: Date,
    endDate: Date,
  },
  refundReason: String,
  refundedAt: Date,
  refundedBy: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema); 