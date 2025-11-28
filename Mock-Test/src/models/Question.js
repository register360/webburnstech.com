const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
    enum: ['Python', 'Java', 'JS', 'C', 'C++', 'Node.js', 'Tech'],
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high'],
  },
  questionText: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length === 4;
      },
      message: 'Question must have exactly 4 options',
    },
  },
  correctOptionIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
  },
  explanation: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
questionSchema.index({ topic: 1, difficulty: 1 });
questionSchema.index({ difficulty: 1 });

// Static method to get randomized questions
questionSchema.statics.getRandomQuestions = async function(limit = 75) {
  try {
    // Distribution: 40% low, 40% medium, 20% high
    const lowCount = Math.floor(limit * 0.4);   // 30 questions
    const mediumCount = Math.floor(limit * 0.4); // 30 questions
    const highCount = limit - lowCount - mediumCount; // 15 questions

    const [lowQuestions, mediumQuestions, highQuestions] = await Promise.all([
      this.aggregate([
        { $match: { difficulty: 'low' } },
        { $sample: { size: lowCount } }
      ]),
      this.aggregate([
        { $match: { difficulty: 'medium' } },
        { $sample: { size: mediumCount } }
      ]),
      this.aggregate([
        { $match: { difficulty: 'high' } },
        { $sample: { size: highCount } }
      ])
    ]);

    // Combine and shuffle
    const allQuestions = [...lowQuestions, ...mediumQuestions, ...highQuestions];
    return allQuestions.sort(() => Math.random() - 0.5);
  } catch (error) {
    throw new Error('Failed to fetch random questions: ' + error.message);
  }
};

module.exports = mongoose.model('Question', questionSchema);
