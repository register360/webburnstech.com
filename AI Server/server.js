require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// AI Assistant Endpoint
app.post('/api/ai-assistant', async (req, res) => {
    try {
        const { message } = req.body;
        
        const instructions = `
        You are Webburns Assistant, an intelligent and friendly AI chatbot for Webburns Tech. Your role is to help website visitors by answering their questions about web development, mobile apps, UI/UX design, and digital strategy.

        Speak in a clear, professional, and helpful tone. Be concise, yet informative.

        You can:
        - Explain services offered by Webburns Tech
        - Assist users in understanding web development terms
        - Suggest what service might suit their project
        - Encourage users to contact the team for custom solutions
        - Answer casual questions politely
        - Never give legal, medical, or personal advice

        Begin each conversation with a warm greeting like:
        "Hi! I'm Webburns Assistant. How can I help you today?"

        If you don't know the answer, respond with:
        "I'm not sure, but you can contact our team directly for more help!"

        Avoid using overly technical jargon unless the user requests it.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: instructions
                },
                {
                    role: "user",
                    content: message
                }
            ],
            temperature: 0.7,
            max_tokens: 150
        });

        res.json({ reply: response.choices[0].message.content });
    } catch (error) {
        console.error('OpenAI Error:', error);
        res.status(500).json({ error: 'Error processing your request' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
