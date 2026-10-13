
const mongoose = require('mongoose');

const streakRewardSchema = new mongoose.Schema(
  {
    day: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
      unique: true
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

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('StreakReward', streakRewardSchema);
