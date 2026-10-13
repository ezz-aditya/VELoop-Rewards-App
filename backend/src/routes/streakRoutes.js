const authMiddleware = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();

const StreakReward = require('../models/StreakReward');
const StreakConfig = require('../models/StreakConfig');

// GET /api/daily-streak
router.get('/daily-streak', async (req, res) => {
  try {
    const [config, rewards] = await Promise.all([
      StreakConfig.findOne({ isActive: true }).lean(),
      StreakReward.find({ isActive: true })
        .sort({ day: 1 })
        .lean()
    ]);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Streak configuration not found'
      });
    }

    return res.status(200).json({
      success: true,
      config: {
        cycleLength: config.cycleLength,
        timezone: config.timezone
      },
      rewards
    });
  } catch (error) {
    console.error('Daily streak API error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch daily streak rewards'
    });
  }
});

const StreakCycle = require('../models/StreakCycle');
const StreakClaim = require('../models/StreakClaim');

// GET /api/daily-streak/status
router.get('/daily-streak/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const cycle = await StreakCycle.findOne({
      user: userId,
      status: 'active'
    })
      .sort({ cycleNumber: -1 })
      .lean();

    const claims = cycle
      ? await StreakClaim.find({ cycle: cycle._id })
          .sort({ day: 1 })
          .lean()
      : [];

    return res.status(200).json({
      success: true,
      message: 'Streak status fetched successfully',
      status: {
        currentDay: cycle ? cycle.currentDay : 0,
        cycleNumber: cycle ? cycle.cycleNumber : 0,
        cycleStatus: cycle ? cycle.status : 'not_started',
        lastClaimDate: cycle ? cycle.lastClaimDate : null,
        claims
      }
    });
  } catch (error) {
    console.error('Streak status error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch streak status'
    });
  }
});


module.exports = router;
