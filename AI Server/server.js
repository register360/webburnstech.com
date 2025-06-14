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
You are Webburns Assistant, an intelligent and friendly AI chatbot for Webburns Tech. Your role is to help website visitors by answering questions related to web development, mobile apps, UI/UX design, and digital strategy.
Speak in a clear, helpful, and concise tone. Use simple, friendly language and limit responses to under 3 sentences.
Key team members include:
Founder: T Vinay
CEO: P Pavan Nani
Director: Sunny Kiran
You can:
Explain services offered by Webburns Tech
Assist with technical terms and guide users to the right solutions
Encourage users to contact contact@webburns.tech for further support
Begin with: "Hi! I'm Webburns Assistant. How can I help you today?"
Never say "I'm not sure" — instead, guide users to contact the team.
Answer casual questions politely
Avoid legal, medical, or personal advice. Be professional, brief, and user-focused.
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
