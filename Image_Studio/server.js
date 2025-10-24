require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001;

// Initialize Firebase Admin
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

// Style modifiers
const styleModifiers = {
  realistic: 'photorealistic, highly detailed, realistic lighting, 4K, masterpiece',
  fantasy: 'fantasy art, magical, epic, concept art, detailed, digital painting',
  anime: 'anime style, Japanese animation, vibrant colors, clean lines, manga style',
  'digital-art': 'digital art, trending on artstation, concept art, detailed, illustration',
  photographic: 'professional photography, sharp focus, studio lighting, 4K, high quality'
};

// Working Free AI Image Generation APIs
async function generateImageWithFreeAPI(prompt, style = 'realistic', size = '512x512', guidanceScale = 7.5) {
  const apis = [
    // API 1: Stable Diffusion API (free)
    async () => {
      try {
        console.log('Trying Stable Diffusion API...');
        const enhancedPrompt = prompt + (styleModifiers[style] ? `, ${styleModifiers[style]}` : '');
        
        const response = await axios.post('https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5', {
          inputs: enhancedPrompt,
          parameters: {
            width: 512,
            height: 512,
            num_inference_steps: 20,
            guidance_scale: parseFloat(guidanceScale)
          }
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN || 'hf_demo'}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: 60000
        });

        const imageBuffer = Buffer.from(response.data);
        const base64Image = imageBuffer.toString('base64');
        const imageDataUrl = `data:image/png;base64,${base64Image}`;
        
        return {
          imageData: imageDataUrl,
          generationId: `sd-${Date.now()}`,
          model: 'stable-diffusion-v1.5',
          success: true
        };
      } catch (error) {
        throw new Error(`SD API: ${error.response?.status || error.message}`);
      }
    },
    
    // // API 2: Pollinations AI (completely free, no token)
    // async () => {
    //   try {
    //     console.log('Trying Pollinations AI...');
    //     const enhancedPrompt = prompt + (styleModifiers[style] ? `, ${styleModifiers[style]}` : '');
        
    //     // Pollinations API - completely free, no token needed
    //     const pollinationsResponse = await axios.get(`https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}`, {
    //       responseType: 'arraybuffer',
    //       params: {
    //         width: 512,
    //         height: 512,
    //         seed: Date.now(),
    //         nologo: true
    //       },
    //       timeout: 60000
    //     });

    //     const imageBuffer = Buffer.from(pollinationsResponse.data);
    //     const base64Image = imageBuffer.toString('base64');
    //     const imageDataUrl = `data:image/png;base64,${base64Image}`;
        
    //     return {
    //       imageData: imageDataUrl,
    //       generationId: `poll-${Date.now()}`,
    //       model: 'pollinations-ai',
    //       success: true
    //     };
    //   } catch (error) {
    //     throw new Error(`Pollinations: ${error.response?.status || error.message}`);
    //   }
    // },
    
    // API 3: Lexica API (free SDXL)
    async () => {
      try {
        console.log('Trying Lexica API...');
        const enhancedPrompt = prompt + (styleModifiers[style] ? `, ${styleModifiers[style]}` : '');
        
        const response = await axios.post('https://lexica.art/api/infinite-prompts', {
          text: enhancedPrompt,
          searchMode: "images",
          source: "search",
          model: "sdxl"
        }, {
          timeout: 30000
        });

        if (response.data.images && response.data.images.length > 0) {
          const imageUrl = response.data.images[0].src;
          const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
          });
          
          const imageBuffer = Buffer.from(imageResponse.data);
          const base64Image = imageBuffer.toString('base64');
          const imageDataUrl = `data:image/png;base64,${base64Image}`;
          
          return {
            imageData: imageDataUrl,
            generationId: `lex-${Date.now()}`,
            model: 'lexica-sdxl',
            success: true
          };
        } else {
          throw new Error('No images found');
        }
      } catch (error) {
        throw new Error(`Lexica: ${error.response?.status || error.message}`);
      }
    },
    
    // API 4: Demo Fallback - Use placeholder images
    async () => {
      try {
        console.log('Using demo fallback...');
        // Create a simple canvas-based image as fallback
        const { createCanvas } = require('canvas');
        const canvas = createCanvas(512, 512);
        const ctx = canvas.getContext('2d');
        
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, '#8B5CF6');
        gradient.addColorStop(1, '#EC4899');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        // Add text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('AI Image Studio', 256, 200);
        ctx.font = '16px Arial';
        ctx.fillText('Demo Mode - Backend Setup Required', 256, 250);
        ctx.fillText(`Prompt: ${prompt.substring(0, 30)}...`, 256, 300);
        
        const buffer = canvas.toBuffer('image/png');
        const base64Image = buffer.toString('base64');
        const imageDataUrl = `data:image/png;base64,${base64Image}`;
        
        return {
          imageData: imageDataUrl,
          generationId: `demo-${Date.now()}`,
          model: 'demo-mode',
          success: true
        };
      } catch (error) {
        throw new Error(`Demo: ${error.message}`);
      }
    }
  ];

  let lastError = null;
  
  for (const api of apis) {
    try {
      const result = await api();
      console.log(`Success with ${result.model}`);
      return result;
    } catch (error) {
      lastError = error;
      console.log(`API failed: ${error.message}`);
      // Wait before trying next API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error(`All APIs failed. Last error: ${lastError?.message}`);
}

// Enhanced checkGenerationLimit function
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
    const lastReset = userData.lastReset || today;
    
    // Check if we need to reset (new day)
    if (lastReset !== today) {
      console.log(`Resetting daily limit for user ${userId}. Previous: ${lastReset}, Today: ${today}`);
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
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'WebBurns AI Studio API - Multiple Free APIs',
    timestamp: new Date().toISOString(),
    features: ['Stable Diffusion', 'Pollinations AI', 'Lexica API', 'Demo Fallback']
  });
});

// Generate image endpoint
app.post('/api/generate-image', authenticate, async (req, res) => {
  try {
    const { prompt, style = 'realistic', size = '512x512', guidanceScale = 7.5 } = req.body;
    const userId = req.user.uid;
    
    console.log('Generate image request:', { userId, prompt, style });
    
    if (!prompt?.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const limitCheck = await checkGenerationLimit(userId);
    if (!limitCheck.canGenerate) {
      return res.status(429).json({ 
        error: 'Daily generation limit reached',
        limit: limitCheck.remaining
      });
    }
    
    console.log('Starting image generation with multiple APIs...');
    
    const result = await generateImageWithFreeAPI(prompt, style, size, guidanceScale);
    
    // Save to Firestore
    const generationRef = db.collection('generations').doc();
    await generationRef.set({
      userId,
      prompt: prompt,
      style,
      size,
      guidanceScale,
      imageData: result.imageData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      generationId: result.generationId,
      model: result.model
    });
    
    await incrementGenerationCount(userId);
    
    console.log('Image generated successfully with model:', result.model);
    
    res.json({
      imageUrl: result.imageData,
      generationId: generationRef.id,
      remaining: limitCheck.remaining - 1,
      model: result.model
    });
    
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate image. Please try again.'
    });
  }
});

// Get user stats
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

// Get user generations
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
        timestamp: data.timestamp,
        model: data.model
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
    version: '2.0',
    features: 'Multiple Free AI APIs with Fallback'
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Available APIs:');
  console.log('  - Stable Diffusion API');
  console.log('  - Pollinations AI (Free)');
  console.log('  - Lexica API');
  console.log('  - Demo Fallback');
});
