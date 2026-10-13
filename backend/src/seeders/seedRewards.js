
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const StreakReward = require('../models/StreakReward');

const rewards = [
  { day: 1, rewardType: 'VES', amount: 5, provider: null, isActive: true },
  { day: 2, rewardType: 'VES', amount: 10, provider: null, isActive: true },
  { day: 3, rewardType: 'VES', amount: 15, provider: null, isActive: true },
  { day: 4, rewardType: 'GIFT_CARD', amount: 1, provider: 'Amazon', isActive: true },
  { day: 5, rewardType: 'GIFT_CARD', amount: 2, provider: 'Amazon', isActive: true },
  { day: 6, rewardType: 'VES', amount: 30, provider: null, isActive: true },
  { day: 7, rewardType: 'GIFT_CARD', amount: 5, provider: 'Amazon', isActive: true }
];

async function seedRewards() {
  try {
    await connectDB();

    const operations = rewards.map((reward) => ({
      updateOne: {
        filter: { day: reward.day },
        update: { $set: reward },
        upsert: true
      }
    }));

    await StreakReward.bulkWrite(operations);

    console.log('All 7 streak rewards seeded successfully.');
  } catch (error) {
    console.error('Failed to seed rewards:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedRewards();
