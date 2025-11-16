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
    origin: ['https://webburns-virtual-friend.onrender.com', 'http://localhost:3000', 'http://127.0.0.1:3000'],
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
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.sessionId = Math.random().toString(36).substring(7);
    }

    async initialize(voiceGender) {
        this.voiceId = voiceGender === 'male' ? CONFIG.VOICE_ID_MALE : CONFIG.VOICE_ID_FEMALE;
        console.log(`Initializing session ${this.sessionId} with voice: ${this.voiceId}`);
        await this.connectToElevenLabs();
    }

    async connectToElevenLabs() {
        try {
            console.log(`[${this.sessionId}] Getting ElevenLabs WebSocket URL...`);
            
            // Get ElevenLabs WebSocket URL for real-time streaming
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
            console.log(`[${this.sessionId}] ElevenLabs WebSocket URL received`);
            
            // Connect to ElevenLabs WebSocket
            this.elevenLabsWs = new WebSocket(elevenLabsConfig.url);
            
            this.elevenLabsWs.on('open', () => {
                console.log(`[${this.sessionId}] Connected to ElevenLabs WebSocket`);
                this.isConnected = true;
                this.reconnectAttempts = 0;
                
                // Send initial configuration to ElevenLabs
                const configMessage = {
                    text: " " // Empty text to initialize
                };
                this.elevenLabsWs.send(JSON.stringify(configMessage));
                
                this.sendToClient({ type: 'ready', message: 'Connected to virtual friend' });
                this.sendToClient({ type: 'info', message: 'Speak now! I\'m listening...' });
            });

            this.elevenLabsWs.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    console.log(`[${this.sessionId}] ElevenLabs message:`, message);
                    
                    if (message.audio) {
                        // Convert base64 audio to buffer
                        const audioBuffer = Buffer.from(message.audio, 'base64');
                        this.sendToClient({ type: 'audio', data: audioBuffer });
                    } else if (message.transcript) {
                        console.log(`[${this.sessionId}] Transcript:`, message.transcript.text, 'Final:', message.transcript.is_final);
                        
                        this.sendToClient({ 
                            type: 'transcript', 
                            text: message.transcript.text,
                            isFinal: message.transcript.is_final || false
                        });

                        if (message.transcript.is_final && message.transcript.text.trim().length > 0) {
                            this.handleFinalTranscript(message.transcript.text);
                        }
                    } else if (message.error) {
                        console.error(`[${this.sessionId}] ElevenLabs error:`, message.error);
                        this.sendToClient({ type: 'error', message: `Voice error: ${message.error}` });
                    } else if (message.message) {
                        console.log(`[${this.sessionId}] ElevenLabs info:`, message.message);
                    }
                } catch (error) {
                    console.error(`[${this.sessionId}] Error processing ElevenLabs message:`, error);
                }
            });

            this.elevenLabsWs.on('close', (code, reason) => {
                console.log(`[${this.sessionId}] ElevenLabs WebSocket closed:`, code, reason?.toString());
                this.isConnected = false;
                
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`[${this.sessionId}] Reconnecting to ElevenLabs (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                    this.sendToClient({ type: 'error', message: 'Voice connection lost. Reconnecting...' });
                    setTimeout(() => this.connectToElevenLabs(), 2000 * this.reconnectAttempts);
                } else {
                    this.sendToClient({ type: 'error', message: 'Voice service unavailable. Please refresh and try again.' });
                }
            });

            this.elevenLabsWs.on('error', (error) => {
                console.error(`[${this.sessionId}] ElevenLabs WebSocket error:`, error);
                this.sendToClient({ type: 'error', message: 'Voice service connection error' });
            });

        } catch (error) {
            console.error(`[${this.sessionId}] Failed to initialize ElevenLabs connection:`, error.message);
            
            let errorMessage = 'Failed to initialize voice service';
            if (error.response?.status === 401) {
                errorMessage = 'Invalid ElevenLabs API key';
            } else if (error.response?.status === 404) {
                errorMessage = 'Voice ID not found';
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Voice service timeout';
            }
            
            this.sendToClient({ type: 'error', message: errorMessage });
            
            // Retry connection after delay
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`[${this.sessionId}] Retrying ElevenLabs connection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                setTimeout(() => this.connectToElevenLabs(), 3000);
            }
        }
    }

    async handleFinalTranscript(transcript) {
        try {
            console.log(`[${this.sessionId}] Processing final transcript: "${transcript}"`);
            
            if (transcript.trim().length < 2) {
                console.log(`[${this.sessionId}] Transcript too short, ignoring`);
                return;
            }
            
            // Get AI response
            const aiResponse = await this.getAIResponse(transcript);
            console.log(`[${this.sessionId}] AI Response:`, aiResponse);
            
            // Send AI response to ElevenLabs for TTS
            if (this.elevenLabsWs && this.isConnected) {
                const ttsMessage = {
                    text: aiResponse,
                    try_trigger_generation: true,
                    generation_config: {
                        chunk_length_schedule: [120, 160, 250, 290]
                    }
                };
                
                console.log(`[${this.sessionId}] Sending TTS request to ElevenLabs`);
                this.elevenLabsWs.send(JSON.stringify(ttsMessage));
                
                // Send AI text to client for display
                this.sendToClient({ 
                    type: 'ai_response', 
                    text: aiResponse 
                });
            } else {
                console.error(`[${this.sessionId}] ElevenLabs WebSocket not connected for TTS`);
                this.sendToClient({ type: 'error', message: 'Voice connection not ready for response' });
            }
        } catch (error) {
            console.error(`[${this.sessionId}] Error processing transcript:`, error);
            this.sendToClient({ type: 'error', message: 'Failed to get AI response' });
        }
    }

    async getAIResponse(userMessage) {
        try {
            console.log(`[${this.sessionId}] Getting AI response for: "${userMessage}"`);
            
            // Using Mistral API
            const response = await axios.post(
                'https://api.mistral.ai/v1/chat/completions',
                {
                    model: "mistral-medium",
                    messages: [
                        {
                            role: "system",
                            content: `You are a warm, friendly, and supportive virtual friend. Keep your responses concise (1-2 sentences), natural, and human-like. Be empathetic, encouraging, and engaging. Respond in a conversational tone. Always respond directly to what the user said.`
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

            const aiResponse = response.data.choices[0].message.content.trim();
            console.log(`[${this.sessionId}] AI response received:`, aiResponse);
            return aiResponse;

        } catch (error) {
            console.error(`[${this.sessionId}] AI API error:`, error.response?.data || error.message);
            
            // Fallback responses based on user input
            const userInput = userMessage.toLowerCase();
            let fallbackResponse;
            
            if (userInput.includes('hello') || userInput.includes('hi') || userInput.includes('hey')) {
                fallbackResponse = "Hello! It's great to talk with you. How are you feeling today?";
            } else if (userInput.includes('how are you')) {
                fallbackResponse = "I'm doing well, thank you for asking! I'm here and ready to chat with you.";
            } else if (userInput.includes('thank')) {
                fallbackResponse = "You're very welcome! I'm always happy to help and listen.";
            } else {
                fallbackResponse = "I understand what you're saying. Tell me more about that!";
            }
            
            return fallbackResponse;
        }
    }

    handleAudioData(audioData) {
        if (this.elevenLabsWs && this.isConnected) {
            try {
                // Convert Buffer to base64 for ElevenLabs
                const audioBase64 = audioData.toString('base64');
                const audioMessage = {
                    audio: audioBase64
                };
                
                this.elevenLabsWs.send(JSON.stringify(audioMessage));
            } catch (error) {
                console.error(`[${this.sessionId}] Error sending audio to ElevenLabs:`, error);
            }
        } else {
            console.log(`[${this.sessionId}] ElevenLabs WebSocket not ready for audio`);
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
                console.error(`[${this.sessionId}] Error sending message to client:`, error);
            }
        }
    }

    close() {
        console.log(`[${this.sessionId}] Closing session`);
        if (this.elevenLabsWs) {
            this.elevenLabsWs.close();
        }
        this.isConnected = false;
    }
}

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log('Client connected from:', clientIp);
    let session = null;

    ws.on('message', async (data) => {
        try {
            if (Buffer.isBuffer(data)) {
                // Binary audio data
                if (session) {
                    session.handleAudioData(data);
                }
            } else {
                // JSON message
                const message = JSON.parse(data.toString());
                console.log('Client message:', message);
                
                switch (message.type) {
                    case 'initialize':
                        if (!session) {
                            session = new VirtualFriendSession(ws);
                            await session.initialize(message.voiceGender);
                        }
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
                        
                    default:
                        console.log('Unknown message type:', message.type);
                }
            }
        } catch (error) {
            console.error('Error processing client message:', error);
            try {
                ws.send(JSON.stringify({ type: 'error', message: 'Error processing your request' }));
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
        console.error('Client WebSocket error:', error);
        if (session) {
            session.close();
            session = null;
        }
    });

    // Send welcome message
    try {
        ws.send(JSON.stringify({ 
            type: 'info', 
            message: 'Connected to Virtual Friend server. Please select an avatar to start.' 
        }));
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
        version: '1.0.0',
        websocket: 'active'
    });
});

// API status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: 'operational',
        connected_clients: wss.clients.size,
        uptime: process.uptime(),
        memory: process.memoryUsage()
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
    console.log(`=========================================`);
    console.log(`Virtual Friend Server Started`);
    console.log(`Port: ${CONFIG.PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`WebSocket Server: Active`);
    console.log(`Ready for connections!`);
    console.log(`=========================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    wss.clients.forEach(client => {
        client.close();
    });
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

module.exports = { app, server };
