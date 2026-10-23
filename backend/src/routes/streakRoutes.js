
const authMiddleware = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const StreakReward = require('../models/StreakReward');
const StreakConfig = require('../models/StreakConfig');
const StreakCycle = require('../models/StreakCycle');
const StreakClaim = require('../models/StreakClaim');

// GET /api/daily-streak
router.get('/daily-streak', async (req, res) => {
  try {
    const [config, rewards] = await Promise.all([
      StreakConfig.findOne({ isActive: true }).lean(),
      StreakReward.find({ isActive: true }).sort({ day: 1 }).lean(),
    ]);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Streak configuration not found',
      });
    }

    return res.status(200).json({
      success: true,
      config: {
        cycleLength: config.cycleLength,
        timezone: config.timezone,
      },
      rewards,
    });
  } catch (error) {
    console.error('Daily streak API error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch daily streak rewards',
    });
  }
});

// GET /api/daily-streak/status
router.get('/daily-streak/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const serverTime = new Date();

    const config = await StreakConfig.findOne({
      isActive: true,
    }).lean();

    if (!config) {
      return res.status(500).json({
        success: false,
        message: 'Streak configuration not found',
      });
    }

    let cycle = await StreakCycle.findOne({
      user: userId,
      status: 'active',
    }).sort({ cycleNumber: -1 });

    // Break the streak after 48 hours without a claim.
    if (cycle?.lastClaimDate) {
      const streakDeadline = new Date(
        cycle.lastClaimDate.getTime() + 48 * 60 * 60 * 1000
      );

      if (serverTime >= streakDeadline) {
        cycle.status = 'broken';
        await cycle.save();
        cycle = null;
      }
    }

    const claims = cycle
      ? await StreakClaim.find({ cycle: cycle._id })
          .sort({ day: 1 })
          .lean()
      : [];

    const lastClaimDate = cycle?.lastClaimDate
      ? new Date(cycle.lastClaimDate)
      : null;

    const nextClaimAt = lastClaimDate
      ? new Date(lastClaimDate.getTime() + 24 * 60 * 60 * 1000)
      : null;

    const cooldownComplete =
      !nextClaimAt || serverTime >= nextClaimAt;

    return res.status(200).json({
      success: true,
      message: 'Streak status fetched successfully',
      status: {
        currentDay: cycle ? cycle.currentDay : 0,
        canClaimToday: cooldownComplete,
        cooldownComplete,
        serverTime: serverTime.toISOString(),
        nextClaimAt: nextClaimAt?.toISOString() ?? null,
        cycleNumber: cycle ? cycle.cycleNumber : 0,
        cycleStatus: cycle ? cycle.status : 'not_started',
        lastClaimDate: cycle ? cycle.lastClaimDate : null,
        claims,
      },
    });
  } catch (error) {
    console.error('Streak status error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch streak status',
    });
  }
});

// POST /api/daily-streak/claim
router.post('/daily-streak/claim', authMiddleware, async (req, res) => {
  let session;

  try {
    session = await mongoose.startSession();

    const userId = req.user.userId;
    const now = new Date();
    let result;

    console.log('CLAIM: route entered');

    await session.withTransaction(async () => {
      console.log('CLAIM: transaction started');

      const config = await StreakConfig.findOne({
        isActive: true,
      })
        .session(session)
        .lean();

      console.log('CLAIM: config fetched', config?.timezone);

      if (!config) {
        throw new Error('STREAK_CONFIG_NOT_FOUND');
      }

      // FIX: Define cycleLength before using it.
      const cycleLength = Number(config.cycleLength);

      if (!Number.isInteger(cycleLength) || cycleLength < 1) {
        throw new Error('INVALID_STREAK_CYCLE_LENGTH');
      }

      let cycle = await StreakCycle.findOne({
        user: userId,
        status: 'active',
      })
        .sort({ cycleNumber: -1 })
        .session(session);

      console.log(
        'CLAIM: active cycle',
        cycle
          ? {
              id: cycle._id,
              cycleNumber: cycle.cycleNumber,
              currentDay: cycle.currentDay,
              lastClaimDate: cycle.lastClaimDate,
              status: cycle.status,
            }
          : null
      );

      // Enforce the 24-hour claim cooldown and 48-hour streak deadline.
      if (cycle?.lastClaimDate) {
        const nextClaimAt = new Date(
          cycle.lastClaimDate.getTime() + 24 * 60 * 60 * 1000
        );

        if (now < nextClaimAt) {
          throw new Error('CLAIM_COOLDOWN_ACTIVE');
        }

        const streakDeadline = new Date(
          cycle.lastClaimDate.getTime() + 48 * 60 * 60 * 1000
        );

        if (now >= streakDeadline) {
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

      // Start Day 1 or a new cycle when required.
      if (!cycle) {
        const latestCycle = await StreakCycle.findOne({
          user: userId,
        })
          .sort({ cycleNumber: -1 })
          .session(session);

        const cycleNumber = latestCycle
          ? latestCycle.cycleNumber + 1
          : 1;

        [cycle] = await StreakCycle.create(
          [
            {
              user: userId,
              cycleNumber,
              startDate: now,
              currentDay: 0,
              status: 'active',
            },
          ],
          { session }
        );
      }

      const day = cycle.currentDay + 1;

      const reward = await StreakReward.findOne({
        day,
        isActive: true,
      }).session(session);

      if (!reward) {
        throw new Error('REWARD_NOT_FOUND');
      }

      const existingClaim = await StreakClaim.findOne({
        cycle: cycle._id,
        day,
      }).session(session);

      if (existingClaim) {
        throw new Error('DUPLICATE_CLAIM');
      }

      let wallet = null;
      let balanceAfter = null;

      // Only VES rewards are credited to the wallet.
      if (reward.rewardType === 'VES') {
        wallet = await Wallet.findOne({
          user: userId,
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
          [
            {
              user: userId,
              wallet: wallet._id,
              type: 'CREDIT',
              amount: reward.amount,
              source: 'STREAK_REWARD',
              balanceAfter,
              description: `Daily streak Day ${day} reward`,
              idempotencyKey: `streak:${cycle._id}:day:${day}`,
            },
          ],
          { session }
        );
      }

      const [claim] = await StreakClaim.create(
        [
          {
            user: userId,
            cycle: cycle._id,
            day,
            rewardType: reward.rewardType,
            amount: reward.amount,
            provider: reward.provider,
            claimedAt: now,
          },
        ],
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
        claimId: claim._id,
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Daily reward claimed successfully',
      claim: result,
    });
  } catch (error) {
    console.error('CLAIM ERROR DETAILS:', {
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
    });

    if (error.message === 'CLAIM_COOLDOWN_ACTIVE') {
      return res.status(409).json({
        success: false,
        message: 'Your next reward is not unlocked yet',
      });
    }

    if (
      error.message === 'DUPLICATE_CLAIM' ||
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message: "This reward has already been claimed",
      });
    }

    if (error.message === 'STREAK_CONFIG_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Streak configuration not found',
      });
    }

    if (error.message === 'INVALID_STREAK_CYCLE_LENGTH') {
      return res.status(500).json({
        success: false,
        message: 'Streak configuration has an invalid cycle length',
      });
    }

    if (error.message === 'REWARD_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Reward configuration not found for this day',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to claim daily reward',
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

// GET /api/daily-streak/history
router.get('/daily-streak/history', authMiddleware, async (req, res) => {
  try {
    const claims = await StreakClaim.find({
      user: req.user.userId,
    })
      .sort({ claimedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Claim history fetched successfully',
      count: claims.length,
      claims,
    });
  } catch (error) {
    console.error('Streak history error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch claim history',
    });
  }
});

// GET /api/wallet
router.get('/wallet', authMiddleware, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      user: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      balance: wallet ? wallet.balance : 0,
    });
  } catch (error) {
    console.error('Wallet fetch error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet balance',
    });
  }
});

module.exports = router;
