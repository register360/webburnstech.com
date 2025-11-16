require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuration
const CONFIG = {
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  AI_MODEL_KEY: process.env.AI_MODEL_KEY,
  VOICE_ID_MALE: process.env.VOICE_ID_MALE,
  VOICE_ID_FEMALE: process.env.VOICE_ID_FEMALE,
  PORT: process.env.PORT || 3000
};

// Validate required environment variables
const requiredEnvVars = ['ELEVENLABS_API_KEY', 'AI_MODEL_KEY', 'VOICE_ID_MALE', 'VOICE_ID_FEMALE'];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
});

class VirtualFriendSession {
  constructor(clientWs) {
    this.clientWs = clientWs;
    this.elevenLabsWs = null;
    this.voiceId = null;
    this.isConnected = false;
    this.buffer = [];
  }

  async initialize(voiceGender) {
    this.voiceId = voiceGender === 'male' ? CONFIG.VOICE_ID_MALE : CONFIG.VOICE_ID_FEMALE;
    await this.connectToElevenLabs();
  }

  async connectToElevenLabs() {
    try {
      // Get ElevenLabs WebSocket URL
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/realtime/tts`,
        {
          model_id: "eleven_monolingual_v1",
          voice_id: this.voiceId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true
          }
        },
        {
          headers: {
            'xi-api-key': CONFIG.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      const { data: elevenLabsConfig } = response;
      
      // Connect to ElevenLabs WebSocket
      this.elevenLabsWs = new WebSocket(elevenLabsConfig.url);
      
      this.elevenLabsWs.on('open', () => {
        console.log('Connected to ElevenLabs WebSocket');
        this.isConnected = true;
        this.sendToClient({ type: 'ready', message: 'Connected to virtual friend' });
      });

      this.elevenLabsWs.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          
          if (message.audio) {
            // Convert base64 audio to buffer
            const audioBuffer = Buffer.from(message.audio, 'base64');
            this.sendToClient({ type: 'audio', data: audioBuffer });
          } else if (message.transcript) {
            this.sendToClient({ 
              type: 'transcript', 
              text: message.transcript.text,
              isFinal: message.transcript.is_final || false
            });

            if (message.transcript.is_final) {
              this.handleFinalTranscript(message.transcript.text);
            }
          } else if (message.error) {
            console.error('ElevenLabs error:', message.error);
            this.sendToClient({ type: 'error', message: message.error });
          }
        } catch (error) {
          console.error('Error processing ElevenLabs message:', error);
        }
      });

      this.elevenLabsWs.on('close', () => {
        console.log('ElevenLabs WebSocket closed');
        this.isConnected = false;
        this.sendToClient({ type: 'error', message: 'Connection lost. Reconnecting...' });
        setTimeout(() => this.connectToElevenLabs(), 5000);
      });

      this.elevenLabsWs.on('error', (error) => {
        console.error('ElevenLabs WebSocket error:', error);
        this.sendToClient({ type: 'error', message: 'Voice service error' });
      });

    } catch (error) {
      console.error('Failed to initialize ElevenLabs connection:', error);
      this.sendToClient({ type: 'error', message: 'Failed to initialize voice service' });
    }
  }

  async handleFinalTranscript(transcript) {
    try {
      console.log('Processing transcript:', transcript);
      
      // Get AI response
      const aiResponse = await this.getAIResponse(transcript);
      
      // Send AI response to ElevenLabs for TTS
      if (this.elevenLabsWs && this.isConnected) {
        const ttsMessage = {
          text: aiResponse,
          try_trigger_generation: true,
          generation_config: {
            chunk_length_schedule: [120, 160, 250, 290]
          }
        };
        
        this.elevenLabsWs.send(JSON.stringify(ttsMessage));
        
        // Send AI text to client for display
        this.sendToClient({ 
          type: 'ai_response', 
          text: aiResponse 
        });
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
      this.sendToClient({ type: 'error', message: 'Failed to get AI response' });
    }
  }

  async getAIResponse(userMessage) {
    try {
      // Using Mistral API (you can replace with any AI model API)
      const response = await axios.post(
        'https://api.mistral.ai/v1/chat/completions',
        {
          model: "mistral-medium",
          messages: [
            {
              role: "system",
              content: `You are a warm, friendly, and supportive virtual friend. Keep your responses concise (1-2 sentences), natural, and human-like. Be empathetic, encouraging, and engaging. Respond in a conversational tone.`
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          max_tokens: 100,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${CONFIG.AI_MODEL_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('AI API error:', error.response?.data || error.message);
      // Fallback response
      return "I'm here for you! What would you like to talk about?";
    }
  }

  handleAudioData(audioData) {
    if (this.elevenLabsWs && this.isConnected) {
      // Send audio data to ElevenLabs
      const audioMessage = {
        audio: audioData.toString('base64')
      };
      this.elevenLabsWs.send(JSON.stringify(audioMessage));
    }
  }

  sendToClient(message) {
    if (this.clientWs.readyState === WebSocket.OPEN) {
      if (message.type === 'audio') {
        // Send binary audio data
        this.clientWs.send(message.data);
      } else {
        // Send JSON message
        this.clientWs.send(JSON.stringify(message));
      }
    }
  }

  close() {
    if (this.elevenLabsWs) {
      this.elevenLabsWs.close();
    }
    this.isConnected = false;
  }
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected');
  let session = null;

  ws.on('message', async (data) => {
    try {
      if (data instanceof Buffer) {
        // Binary audio data
        if (session) {
          session.handleAudioData(data);
        }
      } else {
        // JSON message
        const message = JSON.parse(data);
        
        switch (message.type) {
          case 'initialize':
            session = new VirtualFriendSession(ws);
            await session.initialize(message.voiceGender);
            break;
            
          case 'audio_config':
            // Handle audio configuration if needed
            break;
            
          case 'close':
            if (session) {
              session.close();
              session = null;
            }
            break;
        }
      }
    } catch (error) {
      console.error('Error processing client message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Internal server error' }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (session) {
      session.close();
      session = null;
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    if (session) {
      session.close();
      session = null;
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(CONFIG.PORT, () => {
  console.log(`Virtual Friend server running on port ${CONFIG.PORT}`);
  console.log(`Open http://localhost:${CONFIG.PORT} in your browser`);
});

module.exports = { app, server };
