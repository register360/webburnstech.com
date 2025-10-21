const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const axios = require('axios');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const db = admin.firestore();
const storage = new Storage();
const bucket = storage.bucket(process.env.FIREBASE_STORAGE_BUCKET);

// Hugging Face Configuration
const HUGGINGFACE_MODELS = {
  'realistic': 'runwayml/stable-diffusion-v1-5',
  'anime': '22h/vintedois-diffusion-v0-1',
  'digital-art': 'wavymulder/Analog-Diffusion',
  'fantasy': 'dreamlike-art/dreamlike-diffusion-1.0',
  'default': 'runwayml/stable-diffusion-v1-5'
};

// Utility function to upload image to Firebase Storage
async function uploadToStorage(imageBuffer, fileName) {
  const file = bucket.file(`generated-images/${fileName}-${Date.now()}.png`);
  
  await file.save(imageBuffer, {
    metadata: {
      contentType: 'image/png'
    }
  });
  
  // Make the file publicly accessible
  await file.makePublic();
  
  return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
}

// Generate image using Hugging Face Inference API
async function generateImageWithHuggingFace(prompt, style = 'realistic', size = '512x512') {
  try {
    const model = HUGGINGFACE_MODELS[style] || HUGGINGFACE_MODELS.default;
    
    console.log(`Generating image with model: ${model}`);
    console.log(`Prompt: ${prompt}`);
    
    const [width, height] = size.split('x').map(Number);
    
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        inputs: prompt,
        parameters: {
          width: width,
          height: height,
          num_inference_steps: 20,
          guidance_scale: 7.5
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 60000 // 60 second timeout
      }
    );

    console.log('Hugging Face API response received');
    
    // Convert array buffer to buffer
    const imageBuffer = Buffer.from(response.data);
    
    // Upload to Firebase Storage
    const imageUrl = await uploadToStorage(imageBuffer, 'generated');
    
    return {
      imageUrl,
      generationId: `hf-${Date.now()}`,
      model: model
    };
    
  } catch (error) {
    console.error('Hugging Face generation error:', error.response?.data || error.message);
    
    if (error.response?.status === 503) {
      // Model is loading, retry after delay
      throw new Error('Model is loading, please try again in 30 seconds');
    } else if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded, please try again later');
    } else if (error.response?.status === 401) {
      throw new Error('Invalid API token');
    } else {
      throw new Error(`Image generation failed: ${error.response?.data?.error || error.message}`);
    }
  }
}

// Enhanced image generation with fallback
async function generateImageWithFallback(prompt, style, size) {
  try {
    return await generateImageWithHuggingFace(prompt, style, size);
  } catch (error) {
    console.error('Primary generation failed, using fallback:', error.message);
    
    // Fallback to a different model
    try {
      console.log('Trying fallback model...');
      return await generateImageWithHuggingFace(prompt, 'default', size);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError.message);
      throw new Error('All image generation services are currently unavailable');
    }
  }
}

// Authentication middleware
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Routes

// Generate image endpoint
app.post('/api/generate-image', authenticateToken, async (req, res) => {
  try {
    const { prompt, style, size, guidanceScale } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log(`Generation request from user: ${req.user.uid}`);
    console.log(`Prompt: ${prompt}, Style: ${style}, Size: ${size}`);

    // Check user's generation limit
    const userStats = await getUserStats(req.user.uid);
    const limit = userStats.plan === 'free' ? 5 : userStats.plan === 'premium' ? 20 : 1000;
    
    if (userStats.generationsToday >= limit) {
      return res.status(429).json({ error: 'Daily generation limit reached' });
    }

    // Generate image
    const result = await generateImageWithFallback(prompt, style, size);
    
    // Save generation to Firestore
    await db.collection('generations').add({
      userId: req.user.uid,
      imageUrl: result.imageUrl,
      prompt: prompt,
      style: style,
      size: size,
      model: result.model,
      timestamp: admin.firestore.FieldValue.serverTime(),
      generationId: result.generationId
    });

    // Update user stats
    await updateUserStats(req.user.uid);

    res.json({
      imageUrl: result.imageUrl,
      generationId: result.generationId
    });

  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enhance image endpoint (placeholder - you can implement similar logic)
app.post('/api/enhance-image', authenticateToken, async (req, res) => {
  try {
    const { imageUrl, enhancementType } = req.body;
    
    if (!imageUrl || !enhancementType) {
      return res.status(400).json({ error: 'Image URL and enhancement type are required' });
    }

    // For now, return the original image URL
    // You can implement actual enhancement later
    res.json({
      imageUrl: imageUrl,
      enhancementType: enhancementType,
      message: 'Enhancement feature coming soon'
    });

  } catch (error) {
    console.error('Enhancement error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user stats
app.get('/api/user-stats', authenticateToken, async (req, res) => {
  try {
    const stats = await getUserStats(req.user.uid);
    res.json(stats);
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

// Get user generations
app.get('/api/user-generations', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const snapshot = await db.collection('generations')
      .where('userId', '==', req.user.uid)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const generations = [];
    snapshot.forEach(doc => {
      generations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({ generations });
  } catch (error) {
    console.error('Error getting user generations:', error);
    res.status(500).json({ error: 'Failed to get user generations' });
  }
});

// Helper functions
async function getUserStats(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const snapshot = await db.collection('generations')
    .where('userId', '==', userId)
    .where('timestamp', '>=', today)
    .get();

  const generationsToday = snapshot.size;
  
  // Get user plan from Firestore (default to free)
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  const plan = userData?.plan || 'free';

  return {
    generationsToday,
    plan
  };
}

async function updateUserStats(userId) {
  // Stats are calculated on-demand in getUserStats
  // You might want to cache this for better performance
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'WebBurns AI Studio API is running',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Hugging Face Models Available:');
  Object.entries(HUGGINGFACE_MODELS).forEach(([style, model]) => {
    console.log(`  ${style}: ${model}`);
  });
});
