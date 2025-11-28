require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Question = require('../src/models/Question');

// Sample questions for demonstration
// In production, you would load these from a JSON file
const sampleQuestions = [
  // Python Questions - Low
  {
    topic: 'Python',
    difficulty: 'low',
    questionText: 'What is the output of: print(type([]))?',
    options: ["<class 'list'>", "<class 'dict'>", "<class 'tuple'>", "<class 'set'>"],
    correctOptionIndex: 0,
    explanation: 'In Python, [] creates an empty list, and type() returns the class type.'
  },
  {
    topic: 'Python',
    difficulty: 'low',
    questionText: 'Which keyword is used to define a function in Python?',
    options: ['function', 'def', 'func', 'define'],
    correctOptionIndex: 1,
    explanation: 'The "def" keyword is used to define functions in Python.'
  },
  
  // Python Questions - Medium
  {
    topic: 'Python',
    difficulty: 'medium',
    questionText: 'What will be the output of: print([1, 2, 3] + [4, 5])?',
    options: ['[5, 7]', '[1, 2, 3, 4, 5]', 'Error', '[1, 2, 7, 5]'],
    correctOptionIndex: 1,
    explanation: 'The + operator concatenates two lists in Python.'
  },
  
  // Python Questions - High
  {
    topic: 'Python',
    difficulty: 'high',
    questionText: 'What is the time complexity of accessing an element by index in a Python list?',
    options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'],
    correctOptionIndex: 2,
    explanation: 'Lists in Python are implemented as dynamic arrays, allowing O(1) index access.'
  },
  
  // Java Questions - Low
  {
    topic: 'Java',
    difficulty: 'low',
    questionText: 'Which of the following is NOT a primitive data type in Java?',
    options: ['int', 'boolean', 'String', 'float'],
    correctOptionIndex: 2,
    explanation: 'String is a class in Java, not a primitive data type.'
  },
  
  // Java Questions - Medium
  {
    topic: 'Java',
    difficulty: 'medium',
    questionText: 'What is the default value of an instance variable of type int in Java?',
    options: ['null', '0', '1', 'undefined'],
    correctOptionIndex: 1,
    explanation: 'Instance variables of numeric types are initialized to 0 by default.'
  },
  
  // JavaScript Questions - Low
  {
    topic: 'JS',
    difficulty: 'low',
    questionText: 'Which method is used to add an element to the end of an array in JavaScript?',
    options: ['append()', 'push()', 'add()', 'insert()'],
    correctOptionIndex: 1,
    explanation: 'The push() method adds one or more elements to the end of an array.'
  },
  
  // JavaScript Questions - Medium
  {
    topic: 'JS',
    difficulty: 'medium',
    questionText: 'What is the output of: console.log(typeof null)?',
    options: ["'null'", "'undefined'", "'object'", "'boolean'"],
    correctOptionIndex: 2,
    explanation: 'This is a known bug in JavaScript where typeof null returns "object".'
  },
  
  // C Questions - Low
  {
    topic: 'C',
    difficulty: 'low',
    questionText: 'Which operator is used to access the value at a pointer in C?',
    options: ['&', '*', '->', '.'],
    correctOptionIndex: 1,
    explanation: 'The * (dereference) operator is used to access the value at a pointer.'
  },
  
  // C++ Questions - Medium
  {
    topic: 'C++',
    difficulty: 'medium',
    questionText: 'Which of the following supports polymorphism in C++?',
    options: ['Function overloading', 'Virtual functions', 'Both A and B', 'None'],
    correctOptionIndex: 2,
    explanation: 'C++ supports polymorphism through both compile-time (overloading) and runtime (virtual functions).'
  },
  
  // Node.js Questions - Low
  {
    topic: 'Node.js',
    difficulty: 'low',
    questionText: 'Which method is used to include modules in Node.js?',
    options: ['include()', 'require()', 'import()', 'using()'],
    correctOptionIndex: 1,
    explanation: 'The require() function is used to include modules in Node.js (CommonJS).'
  },
  
  // Node.js Questions - Medium
  {
    topic: 'Node.js',
    difficulty: 'medium',
    questionText: 'What is the purpose of package.json in a Node.js project?',
    options: [
      'To define dependencies',
      'To configure project metadata',
      'To specify scripts',
      'All of the above'
    ],
    correctOptionIndex: 3,
    explanation: 'package.json manages project metadata, dependencies, and scripts.'
  },
  
  // Tech Questions - Low
  {
    topic: 'Tech',
    difficulty: 'low',
    questionText: 'What does HTTP stand for?',
    options: [
      'HyperText Transfer Protocol',
      'High Transfer Text Protocol',
      'HyperText Transmission Protocol',
      'High Text Transfer Protocol'
    ],
    correctOptionIndex: 0,
    explanation: 'HTTP stands for HyperText Transfer Protocol.'
  },
  
  // Tech Questions - Medium
  {
    topic: 'Tech',
    difficulty: 'medium',
    questionText: 'Which data structure uses LIFO (Last In First Out) principle?',
    options: ['Queue', 'Stack', 'Array', 'Tree'],
    correctOptionIndex: 1,
    explanation: 'Stack follows the LIFO principle where the last element added is the first to be removed.'
  },
  
  // Tech Questions - High
  {
    topic: 'Tech',
    difficulty: 'high',
    questionText: 'What is the worst-case time complexity of QuickSort?',
    options: ['O(n log n)', 'O(n²)', 'O(n)', 'O(log n)'],
    correctOptionIndex: 1,
    explanation: 'QuickSort has O(n²) worst-case complexity when the pivot is always the smallest or largest element.'
  },
];

const seedQuestions = async () => {
  try {
    console.log('🌱 Starting question seeding process...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');
    
    // Clear existing questions (optional - comment out if you want to keep existing)
    const deleteResult = await Question.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing questions\n`);
    
    // Insert sample questions
    const result = await Question.insertMany(sampleQuestions);
    console.log(`✅ Successfully inserted ${result.length} questions\n`);
    
    // Display summary by topic and difficulty
    const topics = ['Python', 'Java', 'JS', 'C', 'C++', 'Node.js', 'Tech'];
    const difficulties = ['low', 'medium', 'high'];
    
    console.log('📊 Question Distribution:\n');
    for (const topic of topics) {
      const count = await Question.countDocuments({ topic });
      console.log(`  ${topic}: ${count} questions`);
      
      for (const difficulty of difficulties) {
        const diffCount = await Question.countDocuments({ topic, difficulty });
        console.log(`    - ${difficulty}: ${diffCount}`);
      }
    }
    
    console.log('\n📈 Total Questions:', await Question.countDocuments());
    
    console.log('\n💡 Note: These are sample questions. For production:');
    console.log('   1. Create a questions.json file with your full question set');
    console.log('   2. Modify this script to read from the JSON file');
    console.log('   3. Ensure you have 75+ questions with proper distribution\n');
    
    console.log('✅ Seeding completed successfully!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding questions:', error);
    process.exit(1);
  }
};

// Run the seed function
seedQuestions();

// Example questions.json format:
/*
[
  {
    "topic": "Python",
    "difficulty": "low",
    "questionText": "What is the output of: print(type([]))?",
    "options": ["<class 'list'>", "<class 'dict'>", "<class 'tuple'>", "<class 'set'>"],
    "correctOptionIndex": 0,
    "explanation": "In Python, [] creates an empty list, and type() returns the class type."
  },
  ...more questions
]
*/
