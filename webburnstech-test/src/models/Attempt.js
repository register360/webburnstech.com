const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  qId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  selectedIndex: Number,
  savedAt: { type: Date, default: Date.now },
  isMarkedForReview: Boolean
});

const cheatingEventSchema = new mongoose.Schema({
  type: { type: String, required: true },
  time: { type: Date, default: Date.now },
  details: String
});

const attemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  examDate: { type: String, required: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  submittedAt: Date,
  durationSec: { type: Number, default: 7200 },
  answers: [answerSchema],
  score: Number,
  autoSubmitted: { type: Boolean, default: false },
  cheatingEvents: [cheatingEventSchema],
  logs: [mongoose.Schema.Types.Mixed],
  singleSessionKey: { type: String, required: true }
});

attemptSchema.index({ userId: 1 });
attemptSchema.index({ startAt: 1 });

module.exports = mongoose.model('Attempt', attemptSchema);