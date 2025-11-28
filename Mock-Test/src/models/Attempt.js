const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  examDate: {
    type: String,
    required: true,
    default: '2025-11-30',
  },
  startAt: {
    type: Date,
    required: true,
  },
  endAt: {
    type: Date,
    required: true,
  },
  submittedAt: {
    type: Date,
  },
  durationSec: {
    type: Number,
  },
  answers: [{
    qId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    selectedIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
    isMarkedForReview: {
      type: Boolean,
      default: false,
    },
  }],
  score: {
    type: Number,
    default: 0,
  },
  autoSubmitted: {
    type: Boolean,
    default: false,
  },
  cheatingEvents: [{
    type: {
      type: String,
      enum: ['tabChange', 'copy', 'paste', 'unauthorizedFocus', 'multipleTabs', 'devTools', 'contextMenu'],
    },
    time: {
      type: Date,
      default: Date.now,
    },
    details: String,
  }],
  singleSessionKey: {
    type: String,
    required: true,
    unique: true,
  },
  ip: String,
  userAgent: String,
}, {
  timestamps: true,
});

// Indexes
attemptSchema.index({ userId: 1 });
attemptSchema.index({ examDate: 1 });
attemptSchema.index({ singleSessionKey: 1 });

// Method to calculate score
attemptSchema.methods.calculateScore = async function() {
  const Question = mongoose.model('Question');
  
  let correctCount = 0;
  
  for (const answer of this.answers) {
    const question = await Question.findById(answer.qId);
    if (question && question.correctOptionIndex === answer.selectedIndex) {
      correctCount++;
    }
  }
  
  this.score = correctCount * 3; // 3 marks per question
  return this.score;
};

// Method to add cheating event
attemptSchema.methods.addCheatingEvent = function(type, details) {
  this.cheatingEvents.push({
    type,
    details,
    time: new Date(),
  });
  return this.cheatingEvents.length;
};

module.exports = mongoose.model('Attempt', attemptSchema);
