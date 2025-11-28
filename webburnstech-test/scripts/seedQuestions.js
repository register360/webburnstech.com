const mongoose = require('mongoose');
require('dotenv').config();

const Question = require('../src/models/Question');

const sampleQuestions = [
  {
    topic: 'Python',
    difficulty: 'low',
    questionText: 'What is the output of print(2 ** 3 ** 2) in Python?',
    options: ['64', '512', '256', 'SyntaxError'],
    correctOptionIndex: 1,
    explanation: 'Exponentiation is right-associative in Python, so 2 ** 3 ** 2 equals 2 ** (3 ** 2) = 2 ** 9 = 512.'
  },
  {
    topic: 'Java',
    difficulty: 'medium',
    questionText: 'Which of the following is true about Java final keyword?',
    options: [
      'A final class cannot be extended',
      'A final method cannot be overridden',
      'A final variable cannot be reassigned',
      'All of the above'
    ],
    correctOptionIndex: 3,
    explanation: 'The final keyword in Java can be used with classes, methods, and variables with the mentioned behaviors.'
  },
  {
    topic: 'JS',
    difficulty: 'high',
    questionText: 'What is the output of: console.log(1 + "2" + "2" + 1 - 1 + 2) in JavaScript?',
    options: ['1224', '12212', '1223', 'NaN'],
    correctOptionIndex: 2,
    explanation: 'The expression evaluates due to type coercion rules in JavaScript.'
  },
  {
    topic: 'C',
    difficulty: 'medium',
    questionText: 'What is the size of a pointer in a 64-bit system?',
    options: ['4 bytes', '8 bytes', '16 bytes', 'Depends on data type'],
    correctOptionIndex: 1,
    explanation: 'In a 64-bit system, pointers are typically 8 bytes (64 bits) regardless of the data type they point to.'
  },
  {
    topic: 'C++',
    difficulty: 'high',
    questionText: 'Which of the following is true about virtual functions in C++?',
    options: [
      'They must be defined in the base class',
      'They cannot be private',
      'They enable runtime polymorphism',
      'They are automatically inline'
    ],
    correctOptionIndex: 2,
    explanation: 'Virtual functions enable runtime polymorphism through dynamic dispatch.'
  },
  {
    topic: 'Node.js',
    difficulty: 'medium',
    questionText: 'What is the purpose of the event loop in Node.js?',
    options: [
      'To handle HTTP requests',
      'To execute JavaScript code',
      'To manage asynchronous operations',
      'To compile TypeScript'
    ],
    correctOptionIndex: 2,
    explanation: 'The event loop enables Node.js to perform non-blocking I/O operations.'
  },
  {
    topic: 'Tech',
    difficulty: 'low',
    questionText: 'What does API stand for?',
    options: [
      'Application Programming Interface',
      'Advanced Programming Interface',
      'Application Protocol Interface',
      'Automated Programming Interface'
    ],
    correctOptionIndex: 0,
    explanation: 'API stands for Application Programming Interface.'
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing questions
    await Question.deleteMany({});
    console.log('Cleared existing questions');

    // Insert sample questions
    await Question.insertMany(sampleQuestions);
    console.log(`Inserted ${sampleQuestions.length} sample questions`);

    // Generate more questions to reach ~200 total
    const additionalQuestions = generateAdditionalQuestions();
    await Question.insertMany(additionalQuestions);
    console.log(`Inserted ${additionalQuestions.length} additional questions`);

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

function generateAdditionalQuestions() {
  const questions = [];
  const topics = ['Python', 'Java', 'JS', 'C', 'C++', 'Node.js', 'Tech'];
  const difficulties = ['low', 'medium', 'high'];

  for (let i = 0; i < 200; i++) {
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
    
    questions.push({
      topic,
      difficulty,
      questionText: `Sample question ${i + 1} about ${topic} (${difficulty} difficulty)`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctOptionIndex: Math.floor(Math.random() * 4),
      explanation: `Explanation for question ${i + 1}`
    });
  }

  return questions;
}

seedDatabase();