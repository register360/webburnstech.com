const assistantId = "asst_B6TcUnUsM6glZm4exDaAM5Bb"; // From your screenshot

app.post('/api/ai-assistant', async (req, res) => {
  try {
    // Create a thread
    const thread = await openai.beta.threads.create();
    
    // Add user message
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: req.body.message
    });

    // Run assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId
    });

    // Wait for completion
    let runStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    } while (runStatus.status !== "completed");

    // Get responses
    const messages = await openai.beta.threads.messages.list(thread.id);
    const reply = messages.data[0].content[0].text.value;

    res.json({ reply });
  } catch (error) {
    console.error("Assistant error:", error);
    res.json({ reply: "Please contact our team directly for help!" });
  }
});
