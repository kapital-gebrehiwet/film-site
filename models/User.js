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
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
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
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    marketing: {
      type: Boolean,
      default: false
    },
    purchaseConfirmation: {
      type: Boolean,
      default: true
    },
    newMovies: {
      type: Boolean,
      default: true
    },
    lastPurchase: {
      movieId: mongoose.Schema.Types.ObjectId,
      movieTitle: String,
      purchaseDate: Date
    },
    movieNotifications: [{
      movieId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movie'
      },
      title: String,
      fee: {
        type: Number,
        default: 0
      },
      addedAt: {
        type: Date,
        default: Date.now
      },
      isRead: {
        type: Boolean,
        default: false
      }
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User; 