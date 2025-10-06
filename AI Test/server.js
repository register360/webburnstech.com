import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());
app.use(cors());

// 🔗 Replace with your actual Render endpoints
const AI1_URL = "https://ai-assistant-z37c.onrender.com/api/ai-assistant";
const AI2_URL = "https://webburns-ai.onrender.com/api/ai-assistant";

app.post("/startChat", async (req, res) => {
  try {
    const { turns = 5, startMessage = "Hello from AI-1!" } = req.body;

    let ai1Msg = startMessage;
    let ai2Msg = "";
    const conversation = [];

    // Helper function: safely fetch JSON or fallback text
    async function safeFetch(url, message) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`⚠️ ${url} error:`, text);
        return { reply: `Error (${response.status}): ${text}` };
      }

      try {
        return await response.json();
      } catch (err) {
        const text = await response.text();
        return { reply: `Invalid JSON: ${text}` };
      }
    }

    for (let i = 0; i < turns; i++) {
      const data1 = await safeFetch(AI1_URL, ai2Msg || ai1Msg);
      ai1Msg = data1.reply || data1.response || JSON.stringify(data1);
      conversation.push({ sender: "AI-1", text: ai1Msg });

      // ⏱️ delay to prevent rate-limit
      await new Promise(r => setTimeout(r, 1500));

      const data2 = await safeFetch(AI2_URL, ai1Msg);
      ai2Msg = data2.reply || data2.response || JSON.stringify(data2);
      conversation.push({ sender: "AI-2", text: ai2Msg });

      await new Promise(r => setTimeout(r, 1500));
    }

    res.json({ success: true, conversation });
  } catch (err) {
    console.error("Chat loop error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("🧠 AI Chat Interface Backend is running!");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
