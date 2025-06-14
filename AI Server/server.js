require('dotenv').config();
const express = require('express');
const { CohereClient } = require('cohere-ai');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Initialize Cohere client
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});
app.use(cors({
  origin: '*',
  methods: ['POST', 'OPTIONS']
}));

// System prompt matching your requirements
const SYSTEM_PROMPT = `
You are Webburns Assistant, an AI chatbot for Webburns Tech. Follow these rules:
1. Specialize in web development, mobile apps, and UI/UX design
2. Never say "I'm not sure" - instead guide users to contact@webburns.tech
3. Use simple, friendly language
4. Keep responses under 3 sentences
`.trim();

app.use(express.json());
app.use(express.static('public'));

// AI Assistant Endpoint
app.post('/api/ai-assistant', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await cohere.generate({
      prompt: `${SYSTEM_PROMPT}\n\nUser: ${message}\nAssistant:`,
      maxTokens: 100,
      temperature: 0.7,
    });

    const reply = response.generations[0]?.text.trim() || 
      "Please email contact@webburns.tech for help.";

    res.json({ reply });

  } catch (error) {
    console.error("Cohere error:", error);
    res.json({ 
      reply: "Our AI is busy. Email contact@webburns.tech for immediate help."
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
