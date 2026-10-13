
const mongoose = require('mongoose');

const streakClaimSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    cycle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StreakCycle',
      required: true
    },

    day: {
      type: Number,
      required: true,
      min: 1,
      max: 7
    },

    rewardType: {
      type: String,
      enum: ['VES', 'GIFT_CARD'],
      required: true
    },

    amount: {
      type: Number,
      required: true,
      min: 1
    },

    provider: {
      type: String,
      default: null
    },

    claimedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Prevent the same day from being claimed twice in one cycle.
streakClaimSchema.index(
  { cycle: 1, day: 1 },
  { unique: true }
);

module.exports = mongoose.model('StreakClaim', streakClaimSchema);
