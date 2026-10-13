
const mongoose = require('mongoose');

const streakCycleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    cycleNumber: {
      type: Number,
      required: true,
      min: 1
    },

    startDate: {
      type: Date,
      required: true
    },

    lastClaimDate: {
      type: Date,
      default: null
    },

    currentDay: {
      type: Number,
      default: 0,
      min: 0,
      max: 7
    },

    status: {
      type: String,
      enum: ['active', 'completed', 'broken'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

// A user cannot have duplicate cycle numbers.
streakCycleSchema.index(
  { user: 1, cycleNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model('StreakCycle', streakCycleSchema);
