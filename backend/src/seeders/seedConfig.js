
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const StreakConfig = require('../models/StreakConfig');

async function seedConfig() {
  try {
    await connectDB();

    const config = await StreakConfig.findOneAndUpdate(
      {},
      {
        $set: {
          cycleLength: 7,
          timezone: 'Asia/Kolkata',
          isActive: true
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    console.log('Streak configuration saved successfully:');
    console.log(config);
  } catch (error) {
    console.error('Failed to save streak configuration:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedConfig();
