import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  image: {
    type: String,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'vip'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired'],
      default: 'inactive'
    },
    startDate: Date,
    endDate: Date,
    autoRenew: {
      type: Boolean,
      default: false
    }
  },
  purchasedMovies: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Movie',
    default: [],
  },
  moviePayments: {
    type: Map,
    of: {
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
      },
      paymentDate: Date,
      tx_ref: String,
      amount: Number,
      paymentMethod: String
    },
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User; 