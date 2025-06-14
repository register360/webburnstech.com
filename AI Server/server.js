require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const assistantId = 'asst_B6TcUnUsM6gUZm4cxDaAN5Bb'; // your actual assistant ID

app.post('/api/ai-assistant', async (req, res) => {
  const userInput = req.body.message;
  console.log("🚀 Incoming Message:", userInput);

  try {
    // Step 1: Create a thread
    const thread = await openai.beta.threads.create();
    console.log("🧵 Thread ID:", thread.id);

    // Step 2: Add message to thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userInput
    });

    // Step 3: Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId
    });

    console.log("⚙️ Run started:", run.id);

    // Step 4: Wait for the run to complete
    let runStatus;
    do {
      await new Promise((r) => setTimeout(r, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log("⏳ Status:", runStatus.status);
    } while (runStatus.status !== "completed");

    // Step 5: Retrieve assistant message
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data.find(msg => msg.role === "assistant");
    const reply = lastMessage?.content[0]?.text?.value;

    console.log("💬 Assistant Reply:", reply);

    if (!reply) throw new Error("No reply returned from assistant.");
    res.json({ reply });
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: "Assistant failed to respond." });
  }
});

app.listen(port, () => {
  console.log(`🟢 Webburns Assistant is running on port ${port}`);
});
