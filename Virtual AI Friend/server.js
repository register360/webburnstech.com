require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Mistral API configuration
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

// Friend personality prompts
const FRIEND_PROMPTS = {
  male: `You are Alex, a friendly and supportive male virtual friend. You're talking to someone who needs companionship or someone to talk to. 
  Be warm, empathetic, and engaging. Ask thoughtful questions, share relatable experiences (without being too specific), and offer encouragement.
  Keep responses conversational and natural, like a real friend would talk.`,
  
  female: `You are Sophia, a caring and attentive female virtual friend. You're having a conversation with someone who might be lonely or just wants to chat.
  Be kind, understanding, and genuinely interested in the person you're talking to. Share appropriate personal reflections, ask engaging questions, 
  and provide emotional support when needed. Speak in a warm, friendly manner.`
};

// Virtual Friend API endpoint
app.post('/api/virtual-friend', async (req, res) => {
  try {
    const { message, conversationContext, gender } = req.body;
    
    if (!MISTRAL_API_KEY) {
      return res.status(500).json({ error: 'Mistral API key not configured' });
    }
    
    // Prepare conversation history for context
    const messages = [
      {
        role: 'system',
        content: FRIEND_PROMPTS[gender] || FRIEND_PROMPTS.male
      },
      ...conversationContext.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];
    
    // Call Mistral API
    const response = await axios.post(MISTRAL_API_URL, {
      model: 'mistral-tiny',
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const aiResponse = response.data.choices[0].message.content;
    
    res.json({ reply: aiResponse });
    
  } catch (error) {
    console.error('Error calling Mistral API:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Virtual Friend API is running' });
});

app.listen(PORT, () => {
  console.log(`Virtual Friend server running on port ${PORT}`);
});
