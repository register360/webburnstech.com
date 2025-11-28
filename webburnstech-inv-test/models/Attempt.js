const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  examDate: {
    type: String,
    default: '2025-11-30'
  },
  startAt: {
    type: Date,
    required: true
  },
  endAt: {
    type: Date,
    required: true
  },
  submittedAt: Date,
  durationSec: Number,
  answers: [{
    qId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    selectedIndex: Number,
    savedAt: {
      type: Date,
      default: Date.now
    },
    isMarkedForReview: {
      type: Boolean,
      default: false
    }
  }],
  score: Number,
  autoSubmitted: {
    type: Boolean,
    default: false
  },
  cheatingEvents: [{
    type: {
      type: String,
      enum: ['tabChange', 'copy', 'paste', 'unauthorizedFocus', 'multipleTabs', 'devTools']
    },
    time: {
      type: Date,
      default: Date.now
    },
    details: String,
    warningCount: Number
  }],
  logs: [{
    action: String,
    timestamp: Date,
    details: Object
  }]
});

// Calculate score before saving
attemptSchema.pre('save', function(next) {
  if (this.submittedAt && !this.score) {
    this.calculateScore();
  }
  next();
});

attemptSchema.methods.calculateScore = async function() {
  let score = 0;
  
  for (const answer of this.answers) {
    const question = await mongoose.model('Question').findById(answer.qId);
    if (question && answer.selectedIndex === question.correctOptionIndex) {
      score += 3; // 3 marks per question
    }
  }
  
  this.score = score;
  return score;
};

module.exports = mongoose.model('Attempt', attemptSchema);