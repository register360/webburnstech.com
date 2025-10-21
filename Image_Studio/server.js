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

// Prodia API - Free tier available
async function generateImageWithProdia(prompt, style = 'realistic', size = '512x512', guidanceScale = 7.5) {
  try {
    console.log('Generating with Prodia API...');
    
    const modelMap = {
      'realistic': 'dreamshaper_8_93211.safetensors [b18ce83a]',
      'fantasy': 'dreamshaper_8_93211.safetensors [b18ce83a]',
      'anime': 'anythingV5_PrtRE.safetensors [893e49b9]',
      'digital-art': 'dreamshaper_8_93211.safetensors [b18ce83a]',
      'photographic': 'realisticVisionV51_v51VAE.safetensors [64b2c51d]'
    };
    
    // Create generation job
    const createResponse = await axios.post('https://api.prodia.com/v1/job', {
      model: modelMap[style] || modelMap.realistic,
      prompt: prompt,
      steps: 25,
      cfg_scale: parseFloat(guidanceScale),
      width: parseInt(size.split('x')[0]),
      height: parseInt(size.split('x')[1]),
      sampler: 'DPM++ 2M Karras'
    }, {
      headers: {
        'X-Prodia-Key': process.env.PRODIA_API_KEY || 'demo' // Works without API key for demo
      },
      timeout: 30000
    });
    
    const jobId = createResponse.data.job;
    console.log('Prodia job created:', jobId);
    
    // Wait for completion
    let attempts = 0;
    const maxAttempts = 120; // 60 seconds max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const statusResponse = await axios.get(`https://api.prodia.com/v1/job/${jobId}`, {
        headers: {
          'X-Prodia-Key': process.env.PRODIA_API_KEY || 'demo'
        },
        timeout: 10000
      });
      
      console.log('Prodia status:', statusResponse.data.status);
      
      if (statusResponse.data.status === 'succeeded') {
        // Download and convert to base64
        const imageResponse = await axios.get(statusResponse.data.imageUrl, {
          responseType: 'arraybuffer',
          timeout: 30000
        });
        
        const imageBuffer = Buffer.from(imageResponse.data);
        const base64Image = imageBuffer.toString('base64');
        const imageDataUrl = `data:image/png;base64,${base64Image}`;
        
        return {
          imageData: imageDataUrl,
          generationId: `prodia-${Date.now()}`,
          model: 'prodia',
          success: true
        };
      } else if (statusResponse.data.status === 'failed') {
        throw new Error('Prodia generation failed');
      }
      
      attempts++;
    }
    
    throw new Error('Prodia generation timeout');
    
  } catch (error) {
    console.error('Prodia generation error:', error.message);
    throw new Error(`Image generation failed: ${error.message}`);
  }
}

// Check generation limit and increment functions (same as before)
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
    message: 'WebBurns AI Studio API with Prodia',
    timestamp: new Date().toISOString()
  });
});

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
    
    let enhancedPrompt = prompt;
    if (styleModifiers[style]) {
      enhancedPrompt += `, ${styleModifiers[style]}`;
    }
    
    const result = await generateImageWithProdia(enhancedPrompt, style, size, guidanceScale);
    
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

// Other endpoints remain the same...
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
    models: 'Hugging Face with fallback system'
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Using Prodia API for image generation');
});
});
