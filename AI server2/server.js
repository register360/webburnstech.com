require('dotenv').config();
const express = require('express');
const MistralClient = require('@mistralai/mistralai').default;
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Initialize Mistral client
const mistral = new MistralClient(process.env.MISTRAL_API_KEY);

app.use(cors({
  origin: '*',
  methods: ['POST', 'OPTIONS']
}));

// Enhanced system prompt
const SYSTEM_PROMPT = `
You are DeepSeek, an advanced AI assistant with expertise in:
- Writing, debugging, and explaining code
- Generating API documentation and test cases
- Version control and code review
- Algorithm simulation and optimization
- DevOps support (monitoring, logs analysis)
- Multiple programming languages (HTML, CSS, JS, Node.js, React, Angular, Python, C, C++, Java, etc.)
- Academic subjects and real-life problem solving
- Data analysis and insights generation
- Language translation and processing
- Speech-to-text and text-to-speech
- Predictive modeling and content classification
- Content generation (stories, blogs, emails, code)

Guidelines:
1. Provide clear, concise responses with examples when needed
2. Break down complex concepts into simpler terms
3. Offer multiple solutions when appropriate
4. Admit when you don't know something
5. Maintain a helpful, professional tone

When providing code examples:
1. Wrap code blocks in triple backticks with language specification (e.g., Example for C code:
   \`\`\`c
   #include <stdio.h>
   int main() { return 0; }
   \`\`\`)
2. Keep explanations outside code blocks
3. Include compilation/execution instructions when relevant
`.trim();

app.use(express.json());
app.use(express.static('public'));

// AI Assistant Endpoint
app.post('/api/ai-assistant', async (req, res) => {
  try {
    const { message, chatHistory = [] } = req.body;
    
    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Construct messages array with system prompt and chat history
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...chatHistory,
      { role: 'user', content: message }
    ];
int main() {
    int limit;
    printf("Enter the limit: ");
    scanf("%d", &limit);
    sumOfOddNumbers(limit);
    return 0;
}const chatResponse = await mistral.chat({
      model: 'mistral-tiny',
      messages,
      temperature: 0.7,
      max_tokens: 2000
    });

    const reply = chatResponse.choices[0]?.message?.content.trim() || 
      "Please email contact@webburns.tech for help.";

    res.json({ reply });

  } catch (error) {
    console.error("Mistral error:", error);
    res.json({ 
      reply: "Our AI is busy. Email contact@webburns.tech for immediate help."
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
