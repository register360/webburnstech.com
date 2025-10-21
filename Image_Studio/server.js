require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001;

// Initialize Firebase Admin using environment variables
admin.initializeApp({
  credential: admin.credential.cert({
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    universe_domain: "googleapis.com"
  })
});

const db = admin.firestore();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Hugging Face Configuration
const HUGGINGFACE_MODELS = {
  'realistic': 'runwayml/stable-diffusion-v1-5',
  'fantasy': 'dreamlike-art/dreamlike-diffusion-1.0',
  'anime': '22h/vintedois-diffusion-v0-1',
  'digital-art': 'wavymulder/Analog-Diffusion',
  'photographic': 'runwayml/stable-diffusion-v1-5',
  'default': 'runwayml/stable-diffusion-v1-5'
};

// Style modifiers
const styleModifiers = {
  realistic: 'photorealistic, highly detailed, realistic lighting, 4K',
  fantasy: 'fantasy art, magical, epic, concept art, detailed',
  anime: 'anime style, Japanese animation, vibrant colors, clean lines',
  'digital-art': 'digital art, trending on artstation, concept art, detailed',
  photographic: 'professional photography, sharp focus, studio lighting, 4K'
};

// Generate image using Hugging Face API
async function generateImageWithHuggingFace(prompt, style = 'realistic', size = '512x512', guidanceScale = 7.5) {
  try {
    const model = HUGGINGFACE_MODELS[style] || HUGGINGFACE_MODELS.default;
    
    console.log(`Generating image with model: ${model}`);
    
    const [width, height] = size.split('x').map(Number);
    
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        inputs: prompt,
        parameters: {
          width: width,
          height: height,
          num_inference_steps: 20,
          guidance_scale: parseFloat(guidanceScale)
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 120000
      }
    );

    console.log('Hugging Face API response received');
    
    // Convert to base64
    const imageBuffer = Buffer.from(response.data);
    const base64Image = imageBuffer.toString('base64');
    const imageDataUrl = `data:image/png;base64,${base64Image}`;
    
    return {
      imageData: imageDataUrl,
      generationId: `hf-${Date.now()}`,
      model: model
    };
    
  } catch (error) {
    console.error('Hugging Face generation error:', error.response?.data || error.message);
    throw new Error(`Image generation failed: ${error.response?.data?.error || error.message}`);
  }
}

// Check generation limit
const checkGenerationLimit = async (userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      await userRef.set({
        plan: 'free',
        generationsToday: 0,
        lastReset: today,
        totalGenerations: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { canGenerate: true, remaining: 5, generationsToday: 0 };
    }
    
    const userData = userDoc.data();
    
    if (userData.lastReset !== today) {
      await userRef.update({
        generationsToday: 0,
        lastReset: today
      });
      const limit = userData.plan === 'free' ? 5 : userData.plan === 'premium' ? 20 : 1000;
      return { canGenerate: true, remaining: limit, generationsToday: 0 };
    }
    
    const limit = userData.plan === 'free' ? 5 : userData.plan === 'premium' ? 20 : 1000;
    const generationsToday = userData.generationsToday || 0;
    const remaining = limit - generationsToday;
    
    return {
      canGenerate: remaining > 0,
      remaining: Math.max(0, remaining),
      generationsToday: generationsToday
    };
  } catch (error) {
    console.error('Error checking generation limit:', error);
    return { canGenerate: false, remaining: 0, generationsToday: 0 };
  }
};

// Increment generation count
const incrementGenerationCount = async (userId) => {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      generationsToday: admin.firestore.FieldValue.increment(1),
      totalGenerations: admin.firestore.FieldValue.increment(1)
    });
  } catch (error) {
    console.error('Error incrementing generation count:', error);
  }
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'WebBurns AI Studio API is running',
    timestamp: new Date().toISOString()
  });
});

// Generate image endpoint
app.post('/api/generate-image', authenticate, async (req, res) => {
  try {
    const { prompt, style = 'realistic', size = '512x512', guidanceScale = 7.5 } = req.body;
    const userId = req.user.uid;
    
    console.log('Generate image request received:', { userId, prompt, style, size });
    
    if (!prompt?.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Check generation limit
    const limitCheck = await checkGenerationLimit(userId);
    if (!limitCheck.canGenerate) {
      return res.status(429).json({ 
        error: 'Daily generation limit reached',
        limit: limitCheck.remaining
      });
    }
    
    // Enhanced prompt
    let enhancedPrompt = prompt;
    if (styleModifiers[style]) {
      enhancedPrompt += `, ${styleModifiers[style]}`;
    }
    
    // Generate image
    const result = await generateImageWithHuggingFace(enhancedPrompt, style, size, guidanceScale);
    
    // Save to Firestore
    const generationRef = db.collection('generations').doc();
    await generationRef.set({
      userId,
      prompt: prompt,
      enhancedPrompt: enhancedPrompt,
      style,
      size,
      guidanceScale,
      imageData: result.imageData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      generationId: result.generationId,
      model: result.model
    });
    
    // Increment count
    await incrementGenerationCount(userId);
    
    res.json({
      imageUrl: result.imageData,
      generationId: generationRef.id,
      remaining: limitCheck.remaining - 1
    });
    
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate image'
    });
  }
});

// Other endpoints (keep your existing ones)
app.get('/api/user-stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.json({
        plan: 'free',
        generationsToday: 0,
        remaining: 5,
        totalGenerations: 0
      });
    }
    
    const userData = userDoc.data();
    const limit = userData.plan === 'free' ? 5 : userData.plan === 'premium' ? 20 : 1000;
    const generationsToday = userData.generationsToday || 0;
    const remaining = Math.max(0, limit - generationsToday);
    
    res.json({
      plan: userData.plan,
      generationsToday: generationsToday,
      remaining: remaining,
      totalGenerations: userData.totalGenerations || 0
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

app.get('/api/user-generations', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit) || 10;
    
    const generationsSnapshot = await db.collection('generations')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    const generations = [];
    generationsSnapshot.forEach(doc => {
      const data = doc.data();
      generations.push({
        id: doc.id,
        imageUrl: data.imageData,
        prompt: data.prompt,
        style: data.style,
        timestamp: data.timestamp
      });
    });
    
    res.json({ generations });
  } catch (error) {
    console.error('Error fetching generations:', error);
    res.status(500).json({ error: 'Failed to fetch generation history' });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'WebBurns AI Image Studio API',
    status: 'Running',
    endpoints: [
      'GET  /api/health',
      'POST /api/generate-image',
      'GET  /api/user-stats',
      'GET  /api/user-generations'
    ]
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/health');
  console.log('  POST /api/generate-image');
  console.log('  GET  /api/user-stats');
  console.log('  GET  /api/user-generations');
});
