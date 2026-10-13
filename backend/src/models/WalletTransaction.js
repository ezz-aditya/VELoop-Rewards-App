
const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true
    },

    type: {
      type: String,
      enum: ['CREDIT', 'DEBIT'],
      required: true
    },

    amount: {
      type: Number,
      required: true,
      min: 1
    },

    source: {
      type: String,
      enum: ['STREAK_REWARD', 'REDEMPTION', 'ADJUSTMENT'],
      required: true
    },

    balanceAfter: {
      type: Number,
      required: true,
      min: 0
    },

    description: {
      type: String,
      trim: true,
      default: ''
    },

    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  {
    timestamps: true
  }
);

walletTransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model(
  'WalletTransaction',
  walletTransactionSchema
);
