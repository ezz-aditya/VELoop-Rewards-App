
const mongoose = require('mongoose');

const streakConfigSchema = new mongoose.Schema(
  {
    cycleLength: {
      type: Number,
      default: 7,
      min: 1,
      required: true
    },

    timezone: {
      type: String,
      default: 'Asia/Kolkata',
      required: true
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

module.exports = mongoose.model('StreakConfig', streakConfigSchema);
