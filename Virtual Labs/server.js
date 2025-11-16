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

// Enhanced CORS configuration for production
app.use(cors({
    origin: '*',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
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
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    async initialize(voiceGender) {
        this.voiceId = voiceGender === 'male' ? CONFIG.VOICE_ID_MALE : CONFIG.VOICE_ID_FEMALE;
        await this.connectToElevenLabs();
    }

    async connectToElevenLabs() {
        try {
            console.log('Initializing ElevenLabs connection with voice:', this.voiceId);
            
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
                    },
                    timeout: 10000
                }
            );

            const { data: elevenLabsConfig } = response;
            
            // Connect to ElevenLabs WebSocket
            this.elevenLabsWs = new WebSocket(elevenLabsConfig.url);
            
            this.elevenLabsWs.on('open', () => {
                console.log('Connected to ElevenLabs WebSocket');
                this.isConnected = true;
                this.reconnectAttempts = 0;
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

            this.elevenLabsWs.on('close', (code, reason) => {
                console.log('ElevenLabs WebSocket closed:', code, reason.toString());
                this.isConnected = false;
                
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`Attempting to reconnect to ElevenLabs (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                    this.sendToClient({ type: 'error', message: 'Voice connection lost. Reconnecting...' });
                    setTimeout(() => this.connectToElevenLabs(), 2000 * this.reconnectAttempts);
                } else {
                    this.sendToClient({ type: 'error', message: 'Voice service unavailable. Please try again later.' });
                }
            });

            this.elevenLabsWs.on('error', (error) => {
                console.error('ElevenLabs WebSocket error:', error);
                this.sendToClient({ type: 'error', message: 'Voice service error' });
            });

        } catch (error) {
            console.error('Failed to initialize ElevenLabs connection:', error);
            this.sendToClient({ 
                type: 'error', 
                message: error.response?.status === 401 
                    ? 'Invalid ElevenLabs API key' 
                    : 'Failed to initialize voice service' 
            });
            
            // Retry connection after delay
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => this.connectToElevenLabs(), 3000);
            }
        }
    }

    async handleFinalTranscript(transcript) {
        try {
            console.log('Processing transcript:', transcript);
            
            // Get AI response
            const aiResponse = await this.getAIResponse(transcript);
            console.log('AI Response:', aiResponse);
            
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
                    },
                    timeout: 10000
                }
            );

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            console.error('AI API error:', error.response?.data || error.message);
            // Fallback responses
            const fallbackResponses = [
                "I'm here for you! What would you like to talk about?",
                "That's interesting! Tell me more about that.",
                "I understand how you feel. Want to share more?",
                "I'm listening. What's on your mind?"
            ];
            return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        }
    }

    handleAudioData(audioData) {
        if (this.elevenLabsWs && this.isConnected) {
            try {
                // Send audio data to ElevenLabs
                const audioMessage = {
                    audio: audioData.toString('base64')
                };
                this.elevenLabsWs.send(JSON.stringify(audioMessage));
            } catch (error) {
                console.error('Error sending audio to ElevenLabs:', error);
            }
        }
    }

    sendToClient(message) {
        if (this.clientWs.readyState === WebSocket.OPEN) {
            try {
                if (message.type === 'audio') {
                    // Send binary audio data
                    this.clientWs.send(message.data);
                } else {
                    // Send JSON message
                    this.clientWs.send(JSON.stringify(message));
                }
            } catch (error) {
                console.error('Error sending message to client:', error);
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
wss.on('connection', (ws, req) => {
    console.log('Client connected from:', req.headers['x-forwarded-for'] || req.connection.remoteAddress);
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
            try {
                ws.send(JSON.stringify({ type: 'error', message: 'Internal server error' }));
            } catch (sendError) {
                console.error('Error sending error message:', sendError);
            }
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

    // Send welcome message
    try {
        ws.send(JSON.stringify({ type: 'info', message: 'Connected to Virtual Friend server' }));
    } catch (error) {
        console.error('Error sending welcome message:', error);
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'Virtual Friend API',
        version: '1.0.0'
    });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all handler for SPA routing
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

server.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`Virtual Friend server running on port ${CONFIG.PORT}`);
    console.log(`Open https://webburns-virtual-friend.onrender.com in your browser`);
    console.log('Server is ready to accept connections');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

module.exports = { app, server };
