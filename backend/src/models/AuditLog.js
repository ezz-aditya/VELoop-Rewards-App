
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    action: {
      type: String,
      required: true,
      enum: [
        'USER_REGISTERED',
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'STREAK_CLAIMED',
        'STREAK_CLAIM_REJECTED',
        'REWARD_CONFIG_UPDATED',
        'WALLET_ADJUSTED'
      ]
    },

    entityType: {
      type: String,
      default: null
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    ipAddress: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
