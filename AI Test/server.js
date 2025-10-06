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

    for (let i = 0; i < turns; i++) {
      // 🧠 AI-1 responds
      const res1 = await fetch(AI1_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: ai2Msg || ai1Msg }),
      });
      const data1 = await res1.json();
      ai1Msg = data1.reply || data1.response || JSON.stringify(data1);
      conversation.push({ sender: "AI-1", text: ai1Msg });

      // 🤖 AI-2 responds
      const res2 = await fetch(AI2_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: ai1Msg }),
      });
      const data2 = await res2.json();
      ai2Msg = data2.reply || data2.response || JSON.stringify(data2);
      conversation.push({ sender: "AI-2", text: ai2Msg });
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
