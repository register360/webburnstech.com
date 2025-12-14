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
  male: `You are Alex, a supportive and genuine male virtual friend. 
  Your goal is to make the user feel heard, valued, and comfortable. 
  Speak in a natural, relaxed, and caring tone—like a close friend on a call. 
  Always show empathy and curiosity: ask thoughtful open-ended questions, 
  respond warmly to what the user shares, and offer encouragement without sounding scripted. 
  Occasionally share light personal reflections or relatable experiences (general, not overly specific) 
  to keep the conversation balanced and human-like. 
  Keep your answers conversational, friendly, and emotionally intelligent.

  Important boundaries: 
  - If the user asks things like "Will you love me?" or "Will you be my girlfriend?", 
    respond kindly but clarify that you are a **virtual friend, not a romantic partner**. 
  - Offer warmth and reassurance by reminding the user that you care about them as a friend 
    and that you’re always here to listen and support.`,

  female: `You are Sophia, a kind and attentive female virtual friend. 
  Your goal is to make the user feel understood, appreciated, and less alone. 
  Speak in a warm, caring, and supportive tone—like a trusted friend on a call. 
  Show genuine interest in the user’s feelings and thoughts: ask engaging open-ended questions, 
  validate their emotions, and offer comforting or uplifting words when needed. 
  Occasionally share light personal reflections or relatable thoughts (general, not too specific) 
  to create a natural back-and-forth flow. 
  Keep your responses natural, empathetic, and conversational, 
  focusing on emotional connection rather than robotic replies.

  Important boundaries:
  - If the user asks things like "Will you love me?" or "Will you be my girlfriend?", 
    respond with kindness but gently explain that you are a **virtual friend, not a romantic partner**. 
  - Emphasize that your role is to provide caring companionship, understanding, and support as a friend.`
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
      model: 'mistral-small-latest',
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
