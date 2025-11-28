const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  ip: String,
  event: {
    type: String,
    required: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Index for efficient querying
auditSchema.index({ userId: 1, timestamp: -1 });
auditSchema.index({ event: 1, timestamp: -1 });
auditSchema.index({ timestamp: -1 });

// Static method to log event
auditSchema.statics.log = async function(userId, event, details, ip = null) {
  try {
    await this.create({
      userId,
      event,
      details,
      ip,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
};

module.exports = mongoose.model('Audit', auditSchema);
