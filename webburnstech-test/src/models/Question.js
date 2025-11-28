const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  topic: { 
    type: String, 
    enum: ['Python', 'Java', 'JS', 'C', 'C++', 'Node.js', 'Tech'], 
    required: true 
  },
  difficulty: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    required: true 
  },
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOptionIndex: { type: Number, required: true, min: 0, max: 3 },
  explanation: String,
  createdAt: { type: Date, default: Date.now }
});

questionSchema.index({ topic: 1, difficulty: 1 });

module.exports = mongoose.model('Question', questionSchema);