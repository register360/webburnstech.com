import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import Replicate from 'replicate';
import Joi from 'joi';
import sharp from 'sharp';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodeCron from 'node-cron';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://webburns-ai-studio.vercel.app', 'https://webburnstech.ct.ws']
    : ['http://localhost:3000', 'http://127.0.0.1:3000','http://127.0.0.1:5500'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Initialize Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Input Validation Schemas
const generateImageSchema = Joi.object({
  prompt: Joi.string().min(5).max(1000).required(),
  style: Joi.string().valid('realistic', 'fantasy', 'anime', 'digital-art', 'photographic').default('realistic'),
  size: Joi.string().valid('512x512', '768x768', '1024x1024').default('512x512'),
  guidanceScale: Joi.number().min(1).max(20).default(7.5)
});

const enhanceImageSchema = Joi.object({
  imageUrl: Joi.string().uri().required(),
  enhancementType: Joi.string().valid('upscale', 'remove-bg', 'anime-style').required()
});

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
        lastReset: new Date().toISOString().split('T')[0],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        totalGenerations: 0
      });
      return { canGenerate: true, remaining: 5, plan: 'free' };
    }
    
    const userData = userDoc.data();
    const today = new Date().toISOString().split('T')[0];
    
    // Reset counter if it's a new day
    if (userData.lastReset !== today) {
      await userRef.update({
        generationsToday: 0,
        lastReset: today
      });
      const limit = userData.plan === 'free' ? 5 : userData.plan === 'premium' ? 20 : 1000;
      return { canGenerate: true, remaining: limit, plan: userData.plan };
    }
    
    const limit = userData.plan === 'free' ? 5 : userData.plan === 'premium' ? 20 : 1000;
    const remaining = limit - userData.generationsToday;
    
    return {
      canGenerate: remaining > 0,
      remaining: Math.max(0, remaining),
      plan: userData.plan
    };
  } catch (error) {
    console.error('Error checking generation limit:', error);
    return { canGenerate: false, remaining: 0, plan: 'free' };
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Image Generation Endpoint
app.post('/api/generate-image', authenticate, async (req, res) => {
  try {
    // Validate input
    const { error, value } = generateImageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { prompt, style, size, guidanceScale } = value;
    const userId = req.user.uid;
    
    // Check generation limit
    const limitCheck = await checkGenerationLimit(userId);
    if (!limitCheck.canGenerate) {
      return res.status(429).json({ 
        error: 'Daily generation limit reached',
        limit: limitCheck.remaining,
        plan: limitCheck.plan
      });
    }
    
    // Enhanced prompt based on style
    let enhancedPrompt = prompt;
    const styleModifiers = {
      realistic: 'photorealistic, highly detailed, realistic lighting, 8K',
      fantasy: 'fantasy art, magical, epic, concept art, detailed',
      anime: 'anime style, Japanese animation, vibrant colors, detailed',
      'digital-art': 'digital art, trending on artstation, concept art, detailed',
      photographic: 'professional photography, sharp focus, studio lighting, 8K'
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
      version: 'original',
      generationId: generationRef.id
    });
    
    // Increment generation count
    await incrementGenerationCount(userId);
    
    res.json({
      imageUrl,
      generationId: generationRef.id,
      remaining: limitCheck.remaining - 1,
      plan: limitCheck.plan
    });
    
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate image. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Image Enhancement Endpoint
app.post('/api/enhance-image', authenticate, async (req, res) => {
  try {
    // Validate input
    const { error, value } = enhanceImageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { imageUrl, enhancementType } = value;
    const userId = req.user.uid;
    
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
        "cjwbw/animagine-xl:8b21ba0e2ccad35f86b7e4a7ef8c1b4cc6b4a93b1b2c2c4e4e4e4e4e4e4e4e4e",
        {
          input: {
            image: imageUrl,
            prompt: "anime style, Japanese animation, high quality"
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
      version: enhancementType,
      generationId: generationRef.id
    });
    
    res.json({
      imageUrl: enhancedImageUrl,
      generationId: generationRef.id
    });
    
  } catch (error) {
    console.error('Image enhancement error:', error);
    res.status(500).json({ 
      error: 'Failed to enhance image. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get User's Generation History
app.get('/api/user-generations', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit) || 12;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    
    const generationsSnapshot = await db.collection('generations')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .offset(offset)
      .get();
    
    const generations = [];
    generationsSnapshot.forEach(doc => {
      const data = doc.data();
      generations.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || data.timestamp
      });
    });
    
    // Get total count for pagination
    const totalSnapshot = await db.collection('generations')
      .where('userId', '==', userId)
      .count()
      .get();
    
    const total = totalSnapshot.data().count;
    
    res.json({ 
      generations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
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
        remaining: 5,
        totalGenerations: 0
      });
    }
    
    const userData = userDoc.data();
    const limit = userData.plan === 'free' ? 5 : userData.plan === 'premium' ? 20 : 1000;
    const remaining = Math.max(0, limit - userData.generationsToday);
    
    res.json({
      plan: userData.plan,
      generationsToday: userData.generationsToday,
      remaining,
      totalGenerations: userData.totalGenerations || 0
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

// Update User Plan (for admin/internal use)
app.patch('/api/user/plan', authenticate, async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.uid;
    
    if (!['free', 'premium', 'business'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }
    
    const userRef = db.collection('users').doc(userId);
    await userRef.update({ plan });
    
    res.json({ success: true, plan });
  } catch (error) {
    console.error('Error updating user plan:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 WebBurns AI Image Studio server running on port ${port}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${port}/health`);
});

export default app;
