require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const natural = require('natural');
const aposToLexForm = require('apos-to-lex-form');
const SpellCorrector = require('spelling-corrector');
const stopword = require('stopword');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// NLP Setup
const spellCorrector = new SpellCorrector();
spellCorrector.loadDictionary();

// Enhanced AI Response Database
const intentSchema = new mongoose.Schema({
  patterns: [String],
  responses: [String],
  context: String,
  action: String
});

const Intent = mongoose.model('Intent', intentSchema);

// Sample Intents - You'll expand this in your database
const sampleIntents = [
  {
    patterns: ["hi", "hello", "hey"],
    responses: ["Hello! How can I help you today?", "Hi there! What can I do for you?"],
    context: "greeting"
  },
  {
    patterns: ["bye", "goodbye", "see you"],
    responses: ["Goodbye! Come back anytime.", "See you later!"],
    context: "farewell"
  },
  {
    patterns: ["help", "support", "assistance"],
    responses: ["I can help with coding, explanations, and more. What do you need?"],
    context: "help"
  }
];

// Preprocess text for NLP
function preprocessText(text) {
  const lexed = aposToLexForm(text).toLowerCase();
  const alphaOnly = lexed.replace(/[^a-zA-Z\s]+/g, '');
  
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(alphaOnly);
  
  const corrected = tokens.map(word => spellCorrector.correct(word));
  const stopwordsRemoved = stopword.removeStopwords(corrected);
  
  return stopwordsRemoved.join(' ');
}

// Classify user intent
async function classifyIntent(text) {
  const processed = preprocessText(text);
  
  // Check for direct actions
  if (processed.includes("code") || processed.includes("program")) {
    return { action: "code_assistance" };
  }
  if (processed.includes("explain") || processed.includes("what is")) {
    return { action: "explanation" };
  }
  
  // Find best matching intent from database
  const intents = await Intent.find({});
  let bestMatch = { score: 0, intent: null };
  
  intents.forEach(intent => {
    intent.patterns.forEach(pattern => {
      const distance = natural.JaroWinklerDistance(processed, preprocessText(pattern));
      if (distance > bestMatch.score) {
        bestMatch = { score: distance, intent };
      }
    });
  });
  
  return bestMatch.score > 0.7 ? bestMatch.intent : null;
}

// Enhanced AI Response Handler
app.post('/api/ai-assistant', async (req, res) => {
  try {
    const { message, chatHistory } = req.body;
    
    // Determine user intent
    const intent = await classifyIntent(message);
    
    let response;
    if (intent) {
      // Select random response from matched intent
      response = intent.responses[Math.floor(Math.random() * intent.responses.length)];
      
      // Handle specific actions
      if (intent.action === "code_assistance") {
        response = "I'd be happy to help with coding. Please specify the language and what you're trying to achieve.";
      } else if (intent.action === "explanation") {
        response = "I can explain that concept. Could you provide more details about what you'd like to understand?";
      }
    } else {
      // Fallback response
      response = "I'm not sure I understand. Could you rephrase or provide more details?";
    }
    
    res.json({ reply: response });
  } catch (error) {
    console.error('AI processing error:', error);
    res.status(500).json({ error: 'Error processing your request' });
  }
});

// Initialize database and start server
async function initialize() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  
  // Seed sample intents if none exist
  const count = await Intent.countDocuments();
  if (count === 0) {
    await Intent.insertMany(sampleIntents);
    console.log('Sample intents seeded');
  }
  
  app.listen(process.env.PORT, () => {
    console.log(`AI server running on port ${process.env.PORT}`);
  });
}

initialize();
