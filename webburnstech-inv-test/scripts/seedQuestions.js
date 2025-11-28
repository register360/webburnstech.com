const mongoose = require('mongoose');
const Question = require('../models/Question');
require('dotenv').config();

const sampleQuestions = [
  {
    topic: 'Python',
    difficulty: 'low',
    questionText: 'What is the output of print(2 ** 3)?',
    options: ['6', '8', '9', '5'],
    correctOptionIndex: 1,
    explanation: 'The ** operator is used for exponentiation in Python. 2 ** 3 means 2 raised to the power of 3, which is 8.'
  },
  {
    topic: 'Python',
    difficulty: 'medium',
    questionText: 'Which method is used to remove an item from a list by value in Python?',
    options: ['remove()', 'delete()', 'pop()', 'discard()'],
    correctOptionIndex: 0,
    explanation: 'The remove() method removes the first occurrence of the specified value from the list.'
  },
  {
    topic: 'Java',
    difficulty: 'low',
    questionText: 'What is the default value of a boolean variable in Java?',
    options: ['true', 'false', 'null', '0'],
    correctOptionIndex: 1,
    explanation: 'In Java, the default value of a boolean variable is false.'
  },
  {
    topic: 'JS',
    difficulty: 'medium',
    questionText: 'What will be the output of: console.log(typeof null)?',
    options: ['null', 'undefined', 'object', 'number'],
    correctOptionIndex: 2,
    explanation: 'In JavaScript, typeof null returns "object", which is a known historical bug in the language.'
  },
  {
    topic: 'C',
    difficulty: 'high',
    questionText: 'What is the time complexity of accessing an element in an array by index?',
    options: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'],
    correctOptionIndex: 0,
    explanation: 'Array access by index is a constant time operation O(1) as it involves simple pointer arithmetic.'
  },
  {
    topic: 'C++',
    difficulty: 'medium',
    questionText: 'Which keyword is used to create a constant in C++?',
    options: ['constant', 'const', 'final', 'readonly'],
    correctOptionIndex: 1,
    explanation: 'The const keyword is used to define constants in C++.'
  },
  {
    topic: 'Node.js',
    difficulty: 'low',
    questionText: 'What is Node.js primarily used for?',
    options: ['Frontend development', 'Mobile development', 'Server-side development', 'Desktop applications'],
    correctOptionIndex: 2,
    explanation: 'Node.js is a JavaScript runtime built on Chrome V8 JavaScript engine, used for server-side development.'
  },
  {
    topic: 'Tech',
    difficulty: 'high',
    questionText: 'In the OSI model, which layer is responsible for end-to-end communication and error recovery?',
    options: ['Network Layer', 'Transport Layer', 'Session Layer', 'Application Layer'],
    correctOptionIndex: 1,
    explanation: 'The Transport Layer (Layer 4) is responsible for end-to-end communication, flow control, and error recovery.'
  }
];

async function seedQuestions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing questions
    await Question.deleteMany({});
    console.log('Cleared existing questions');

    // Insert sample questions
    await Question.insertMany(sampleQuestions);
    console.log(`Inserted ${sampleQuestions.length} sample questions`);

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedQuestions();