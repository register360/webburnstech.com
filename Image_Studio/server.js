require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const Replicate = require('replicate');

const app = express();
const port = process.env.PORT || 3001;

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Initialize Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

app.use(cors());
app.use(express.json());

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

// Check user's generation limit
const checkGenerationLimit = async (userId) => {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Create new user document
      await userRef.set({
        plan: 'free',
        generationsToday: 0,
        lastReset: new Date().toISOString().split('T')[0]
      });
      return { canGenerate: true, remaining: 5 };
    }
    
    const userData = userDoc.data();
    const today = new Date().toISOString().split('T')[0];
    
    // Reset counter if it's a new day
    if (userData.lastReset !== today) {
      await userRef.update({
        generationsToday: 0,
        lastReset: today
      });
      return { canGenerate: true, remaining: userData.plan === 'free' ? 5 : userData.plan === 'premium' ? 20 : 1000 };
    }
    
    const limit = userData.plan === 'free' ? 5 : userData.plan === 'premium' ? 20 : 1000;
    const remaining = limit - userData.generationsToday;
    
    return {
      canGenerate: remaining > 0,
      remaining: Math.max(0, remaining)
    };
  } catch (error) {
    console.error('Error checking generation limit:', error);
    return { canGenerate: false, remaining: 0 };
  }
};

// Increment generation count
const incrementGenerationCount = async (userId) => {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      generationsToday: admin.firestore.FieldValue.increment(1)
    });
  } catch (error) {
    console.error('Error incrementing generation count:', error);
  }
};

// Image Generation Endpoint
app.post('/api/generate-image', authenticate, async (req, res) => {
  try {
    const { prompt, style = 'realistic', size = '512x512', guidanceScale = 7.5 } = req.body;
    const userId = req.user.uid;
    
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
    
    // Enhanced prompt based on style
    let enhancedPrompt = prompt;
    const styleModifiers = {
      realistic: 'photorealistic, highly detailed, realistic lighting',
      fantasy: 'fantasy art, magical, epic, concept art',
      anime: 'anime style, Japanese animation, vibrant colors',
      'digital-art': 'digital art, trending on artstation, concept art',
      photographic: 'professional photography, sharp focus, studio lighting'
    };
    
    if (styleModifiers[style]) {
      enhancedPrompt += `, ${styleModifiers[style]}`;
    }
    
    // Generate image using Replicate (Stable Diffusion)
    const output = await replicate.run(
      "stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478",
      {
        input: {
          prompt: enhancedPrompt,
          width: parseInt(size.split('x')[0]),
          height: parseInt(size.split('x')[1]),
          num_outputs: 1,
          guidance_scale: parseFloat(guidanceScale),
          num_inference_steps: 50
        }
      }
    );
    
    const imageUrl = output[0];
    
    // Save generation to user's history
    const generationRef = db.collection('generations').doc();
    await generationRef.set({
      userId,
      prompt,
      enhancedPrompt,
      style,
      size,
      guidanceScale,
      imageUrl,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      version: 'original'
    });
    
    // Increment generation count
    await incrementGenerationCount(userId);
    
    res.json({
      imageUrl,
      generationId: generationRef.id,
      remaining: limitCheck.remaining - 1
    });
    
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate image. Please try again.',
      details: error.message
    });
  }
});

// Image Enhancement Endpoint
app.post('/api/enhance-image', authenticate, async (req, res) => {
  try {
    const { imageUrl, enhancementType } = req.body;
    const userId = req.user.uid;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }
    
    let enhancedImageUrl;
    
    if (enhancementType === 'upscale') {
      // Use Real-ESRGAN for upscaling
      enhancedImageUrl = await replicate.run(
        "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
        {
          input: {
            image: imageUrl,
            scale: 2
          }
        }
      );
    } else if (enhancementType === 'remove-bg') {
      // Use background removal model
      enhancedImageUrl = await replicate.run(
        "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
        {
          input: {
            image: imageUrl
          }
        }
      );
    } else if (enhancementType === 'anime-style') {
      // Use anime style transfer
      enhancedImageUrl = await replicate.run(
        "cjwbw/animagine-xl:47c0f5d8c8d1c5e86b6c2dd0d9c5b7c6a7c9a7c5e5e5e5e5e5e5e5e5e5e5e5e5",
        {
          input: {
            image: imageUrl,
            prompt: "anime style, Japanese animation"
          }
        }
      );
    } else {
      return res.status(400).json({ error: 'Invalid enhancement type' });
    }
    
    // Save enhanced image to user's history
    const generationRef = db.collection('generations').doc();
    await generationRef.set({
      userId,
      originalImage: imageUrl,
      enhancementType,
      imageUrl: enhancedImageUrl,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      version: enhancementType
    });
    
    res.json({
      imageUrl: enhancedImageUrl,
      generationId: generationRef.id
    });
    
  } catch (error) {
    console.error('Image enhancement error:', error);
    res.status(500).json({ 
      error: 'Failed to enhance image. Please try again.',
      details: error.message
    });
  }
});

// Get User's Generation History
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
      generations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({ generations });
  } catch (error) {
    console.error('Error fetching generations:', error);
    res.status(500).json({ error: 'Failed to fetch generation history' });
  }
});

// Get User's Generation Stats
app.get('/api/user-stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.json({
        plan: 'free',
        generationsToday: 0,
        remaining: 5
      });
    }
    
    const userData = userDoc.data();
    const limit = userData.plan === 'free' ? 5 : userData.plan === 'premium' ? 20 : 1000;
    const remaining = Math.max(0, limit - userData.generationsToday);
    
    res.json({
      plan: userData.plan,
      generationsToday: userData.generationsToday,
      remaining
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// Delete Generation
app.delete('/api/generation/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    
    const generationRef = db.collection('generations').doc(id);
    const generationDoc = await generationRef.get();
    
    if (!generationDoc.exists) {
      return res.status(404).json({ error: 'Generation not found' });
    }
    
    if (generationDoc.data().userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this generation' });
    }
    
    await generationRef.delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting generation:', error);
    res.status(500).json({ error: 'Failed to delete generation' });
  }
});

app.listen(port, () => {
  console.log(`WebBurns AI Image Studio server running on port ${port}`);
});
