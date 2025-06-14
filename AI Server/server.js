require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

// ✅ Define app before using it
const app = express();
const port = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI SDK
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const assistantId = 'asst_B6TcUnUsM6gUZm4cxDaAN5Bb'; // your assistant ID

// AI Assistant endpoint
app.post('/api/ai-assistant', async (req, res) => {
  const userInput = req.body.message;

  try {
    const thread = await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userInput
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId
    });

    let runStatus;
    do {
      await new Promise((r) => setTimeout(r, 1500));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    } while (runStatus.status !== "completed");

    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data.find(msg => msg.role === "assistant");

    res.json({ reply: lastMessage?.content[0]?.text?.value || "No response." });
  } catch (error) {
    console.error('OpenAI Assistant Error:', error.message);
    res.status(500).json({ error: 'Assistant failed to respond.' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Webburns Assistant is running on port ${port}`);
});
