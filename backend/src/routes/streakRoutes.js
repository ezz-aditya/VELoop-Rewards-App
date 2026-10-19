const authMiddleware = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
function getIndiaDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const values = {};

  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
}

function getYesterdayDateString() {
  const today = getIndiaDateString();
  const date = new Date(`${today}T00:00:00Z`);

  date.setUTCDate(date.getUTCDate() - 1);

  return date.toISOString().slice(0, 10);
}
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

function getDateKey(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const values = {};

  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
}

function getPreviousDateKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}


router.post('/daily-streak/claim', authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const userId = req.user.userId;
    const now = new Date();
    let result;

    await session.withTransaction(async () => {
      const config = await StreakConfig.findOne({
        isActive: true
      }).session(session);

      if (!config) {
        throw new Error('STREAK_CONFIG_NOT_FOUND');
      }

      const timezone = config.timezone;
      const cycleLength = config.cycleLength;
      const todayKey = getDateKey(now, timezone);
      const yesterdayKey = getPreviousDateKey(todayKey);

      let cycle = await StreakCycle.findOne({
        user: userId,
        status: 'active'
      })
        .sort({ cycleNumber: -1 })
        .session(session);

      let day;

      if (cycle && cycle.lastClaimDate) {
        const lastKey = getDateKey(
          cycle.lastClaimDate,
          timezone
        );

        if (lastKey === todayKey) {
          throw new Error('ALREADY_CLAIMED_TODAY');
        }

        if (lastKey !== yesterdayKey) {
          cycle.status = 'broken';
          await cycle.save({ session });
          cycle = null;
        }
      }

      if (cycle && cycle.currentDay >= cycleLength) {
        cycle.status = 'completed';
        await cycle.save({ session });
        cycle = null;
      }

      if (!cycle) {
        const latestCycle = await StreakCycle.findOne({
          user: userId
        })
          .sort({ cycleNumber: -1 })
          .session(session);

        const cycleNumber = latestCycle
          ? latestCycle.cycleNumber + 1
          : 1;

        [cycle] = await StreakCycle.create(
          [{
            user: userId,
            cycleNumber,
            startDate: now,
            currentDay: 0,
            status: 'active'
          }],
          { session }
        );
      }

      day = cycle.currentDay + 1;

      const reward = await StreakReward.findOne({
        day,
        isActive: true
      }).session(session);

      if (!reward) {
        throw new Error('REWARD_NOT_FOUND');
      }

      const existingClaim = await StreakClaim.findOne({
        cycle: cycle._id,
        day
      }).session(session);

      if (existingClaim) {
        throw new Error('DUPLICATE_CLAIM');
      }

      let wallet = null;
      let balanceAfter = null;

      if (reward.rewardType === 'VES') {
        wallet = await Wallet.findOne({
          user: userId
        }).session(session);

        if (!wallet) {
          [wallet] = await Wallet.create(
            [{ user: userId, balance: 0 }],
            { session }
          );
        }

        wallet.balance += reward.amount;
        await wallet.save({ session });

        balanceAfter = wallet.balance;

        await WalletTransaction.create(
          [{
            user: userId,
            wallet: wallet._id,
            type: 'CREDIT',
            amount: reward.amount,
            source: 'STREAK_REWARD',
            balanceAfter,
            description: `Daily streak Day ${day} reward`,
            idempotencyKey: `streak:${cycle._id}:day:${day}`
          }],
          { session }
        );
      }

      const [claim] = await StreakClaim.create(
        [{
          user: userId,
          cycle: cycle._id,
          day,
          rewardType: reward.rewardType,
          amount: reward.amount,
          provider: reward.provider,
          claimedAt: now
        }],
        { session }
      );

      cycle.currentDay = day;
      cycle.lastClaimDate = now;

      if (day >= cycleLength) {
        cycle.status = 'completed';
      }

      await cycle.save({ session });

      result = {
        day,
        rewardType: reward.rewardType,
        amount: reward.amount,
        provider: reward.provider,
        walletBalance: balanceAfter,
        cycleNumber: cycle.cycleNumber,
        cycleStatus: cycle.status,
        claimId: claim._id
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Daily reward claimed successfully',
      claim: result
    });
  } catch (error) {
    if (error.message === 'ALREADY_CLAIMED_TODAY') {
      return res.status(409).json({
        success: false,
        message: 'You have already claimed today’s reward'
      });
    }

    if (error.message === 'DUPLICATE_CLAIM' ||
        error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This reward has already been claimed'
      });
    }

    if (error.message === 'STREAK_CONFIG_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Streak configuration not found'
      });
    }

    if (error.message === 'REWARD_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Reward configuration not found for this day'
      });
    }

    console.error('Claim API error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to claim daily reward'
    });
  } finally {
    await session.endSession();
  }
});


router.get('/daily-streak/history', authMiddleware, async (req, res) => {
  try {
    const claims = await StreakClaim.find({
      user: req.user.userId
    })
      .sort({ claimedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Claim history fetched successfully',
      count: claims.length,
      claims
    });
  } catch (error) {
    console.error('Streak history error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch claim history'
    });
  }
});

router.get('/wallet', authMiddleware, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      user: req.user.userId,
    });

    res.json({
      success: true,
      balance: wallet ? wallet.balance : 0,
    });
  } catch (error) {
    console.error('Wallet fetch error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet balance',
    });
  }
});


module.exports = router;
