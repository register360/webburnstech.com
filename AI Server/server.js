const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

// Replace with your Hugging Face model (optional: add your own token for higher limits)
const HF_MODEL_URL = 'https://api-inference.huggingface.co/models/google/flan-t5-small';
const HF_API_KEY = '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'; // optional: 'hf_abc123...'

app.post('/api/ai-assistant', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await fetch(HF_MODEL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(HF_API_KEY && { 'Authorization': `Bearer ${HF_API_KEY}` })
      },
      body: JSON.stringify({
        inputs: `Answer this: ${userMessage}`
      })
    });

    const data = await response.json();
    const reply = data?.[0]?.generated_text || "I'm not sure how to answer that.";

    res.json({ reply });
  } catch (error) {
    console.error('Hugging Face Error:', error.message);
    res.status(500).json({ reply: "Sorry, I had trouble responding." });
  }
});

app.listen(port, () => {
  console.log(`🧠 Hugging Face Assistant running on http://localhost:${port}`);
});
