import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ['free', 'basic', 'premium', 'vip'],
    required: true,
    unique: true
  },
  price: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // in days
    required: true
  },
  features: {
    type: [String],
    required: true
  },
  maxMovies: {
    type: Number,
    required: true
  },
  videoQuality: {
    type: String,
    enum: ['HD', 'Full HD', '4K', '8K'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
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

const SubscriptionPlan = mongoose.models.SubscriptionPlan || mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

export default SubscriptionPlan; 