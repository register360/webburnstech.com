const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const videoGenerationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: (req) => {
    // Different limits based on user plan
    return req.user?.plan === 'premium' ? 
      parseInt(process.env.DAILY_VIDEO_LIMIT_PREMIUM) : 
      parseInt(process.env.DAILY_VIDEO_LIMIT_FREE);
  },
  message: {
    error: 'Daily video generation limit exceeded',
    limit: process.env.DAILY_VIDEO_LIMIT_FREE,
    upgrade: 'Upgrade to premium for more generations'
  }
});

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
});

const db = admin.firestore();
const auth = admin.auth();

// Initialize Google Drive
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_DRIVE_CLIENT_ID,
  process.env.GOOGLE_DRIVE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid authentication token' });
  }
};

// Utility Functions
class VideoGenerationManager {
  constructor() {
    this.apis = [
      { name: 'wan', priority: 1, enabled: !!process.env.WAN_API_KEY },
      { name: 'mochi', priority: 2, enabled: !!process.env.MOCHI_API_KEY },
      { name: 'open-sora', priority: 3, enabled: !!process.env.OPEN_SORA_API_KEY },
      { name: 'creatomate', priority: 4, enabled: !!process.env.CREATOMATE_API_KEY }
    ].filter(api => api.enabled).sort((a, b) => a.priority - b.priority);
  }

  async generateVideoFromText(prompt, options) {
    for (const api of this.apis) {
      try {
        console.log(`Trying ${api.name} API for text-to-video...`);
        const result = await this.callApi(api.name, 'text', { prompt, ...options });
        return result;
      } catch (error) {
        console.error(`${api.name} API failed:`, error.message);
        continue;
      }
    }
    throw new Error('All video generation APIs are currently unavailable');
  }

  async generateVideoFromImage(imageBuffer, prompt, options) {
    for (const api of this.apis) {
      try {
        console.log(`Trying ${api.name} API for image-to-video...`);
        const result = await this.callApi(api.name, 'image', { image: imageBuffer, prompt, ...options });
        return result;
      } catch (error) {
        console.error(`${api.name} API failed:`, error.message);
        continue;
      }
    }
    throw new Error('All video generation APIs are currently unavailable');
  }

  async callApi(apiName, type, data) {
    const baseUrls = {
      wan: 'https://api.wan.ai/v1/video',
      mochi: 'https://api.mochi.ai/v1/generate',
      'open-sora': 'https://api.open-sora.org/v1/video',
      creatomate: 'https://api.creatomate.com/v1/renders'
    };

    const apiKey = process.env[`${apiName.toUpperCase().replace('-', '_')}_API_KEY`];
    
    switch (apiName) {
      case 'wan':
        return await this.callWanAPI(baseUrls.wan, apiKey, type, data);
      case 'mochi':
        return await this.callMochiAPI(baseUrls.mochi, apiKey, type, data);
      case 'open-sora':
        return await this.callOpenSoraAPI(baseUrls['open-sora'], apiKey, type, data);
      case 'creatomate':
        return await this.callCreatomateAPI(baseUrls.creatomate, apiKey, type, data);
      default:
        throw new Error(`Unknown API: ${apiName}`);
    }
  }

  async callWanAPI(baseUrl, apiKey, type, data) {
    const config = {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    const payload = type === 'text' ? {
      prompt: data.prompt,
      duration: data.duration || 5,
      style: data.style || 'realistic',
      aspect_ratio: data.aspectRatio || '16:9'
    } : {
      image: data.image.toString('base64'),
      prompt: data.prompt,
      duration: data.duration || 5,
      style: data.style || 'realistic'
    };

    const response = await axios.post(`${baseUrl}/generate`, payload, config);
    return response.data;
  }

  async callMochiAPI(baseUrl, apiKey, type, data) {
    const config = {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    const payload = type === 'text' ? {
      text_prompt: data.prompt,
      video_length: data.duration || 5,
      style_preset: data.style || 'realistic',
      resolution: this.getResolution(data.aspectRatio)
    } : {
      image_input: data.image.toString('base64'),
      text_prompt: data.prompt,
      video_length: data.duration || 5
    };

    const response = await axios.post(`${baseUrl}/video`, payload, config);
    return response.data;
  }

  async callOpenSoraAPI(baseUrl, apiKey, type, data) {
    const config = {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    const payload = type === 'text' ? {
      model: "open-sora-2.0",
      prompt: data.prompt,
      steps: 50,
      cfg_scale: data.guidance || 7.5,
      size: this.getVideoSize(data.aspectRatio)
    } : {
      model: "open-sora-2.0",
      prompt: data.prompt,
      init_image: data.image.toString('base64'),
      steps: 50
    };

    const response = await axios.post(`${baseUrl}/generate`, payload, config);
    return response.data;
  }

  async callCreatomateAPI(baseUrl, apiKey, type, data) {
    const config = {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    const payload = {
      source: {
        output_format: "mp4",
        width: 1280,
        height: 720,
        elements: [
          {
            type: type === 'text' ? "text" : "image",
            [type === 'text' ? "text" : "source"]: type === 'text' ? data.prompt : `data:image/jpeg;base64,${data.image.toString('base64')}`,
            duration: data.duration || 5,
            animations: [
              {
                type: "fade-in",
                duration: 0.5
              }
            ]
          }
        ]
      }
    };

    const response = await axios.post(baseUrl, payload, config);
    return response.data;
  }

  getResolution(aspectRatio) {
    const resolutions = {
      '16:9': '1920x1080',
      '9:16': '1080x1920',
      '1:1': '1080x1080',
      '4:3': '1024x768'
    };
    return resolutions[aspectRatio] || '1920x1080';
  }

  getVideoSize(aspectRatio) {
    const sizes = {
      '16:9': '1920x1080',
      '9:16': '1080x1920',
      '1:1': '1024x1024',
      '4:3': '1024x768'
    };
    return sizes[aspectRatio] || '1920x1080';
  }
}

class GoogleDriveManager {
  constructor() {
    this.drive = drive;
    this.baseFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  }

  async createUserFolder(userId) {
    try {
      const folderMetadata = {
        name: `user_${userId}`,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [this.baseFolderId]
      };

      const folder = await this.drive.files.create({
        resource: folderMetadata,
        fields: 'id'
      });

      return folder.data.id;
    } catch (error) {
      console.error('Error creating user folder:', error);
      // If folder creation fails, use base folder
      return this.baseFolderId;
    }
  }

  async uploadVideo(videoBuffer, userId, fileName) {
    try {
      // Get or create user folder
      let userFolderId = await this.getUserFolderId(userId);
      if (!userFolderId) {
        userFolderId = await this.createUserFolder(userId);
      }

      const fileMetadata = {
        name: fileName,
        parents: [userFolderId]
      };

      const media = {
        mimeType: 'video/mp4',
        body: require('stream').Readable.from(videoBuffer)
      };

      const file = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink'
      });

      // Make the file publicly accessible
      await this.drive.permissions.create({
        fileId: file.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      // Get the direct download link
      const directLink = `https://drive.google.com/uc?export=download&id=${file.data.id}`;
      
      return {
        fileId: file.data.id,
        webViewLink: file.data.webViewLink,
        directDownloadLink: directLink,
        fileName: file.data.name
      };
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      throw new Error('Failed to upload video to storage');
    }
  }

  async getUserFolderId(userId) {
    try {
      const response = await this.drive.files.list({
        q: `name='user_${userId}' and mimeType='application/vnd.google-apps.folder' and '${this.baseFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)'
      });

      return response.data.files[0]?.id || null;
    } catch (error) {
      console.error('Error getting user folder:', error);
      return null;
    }
  }
}

class UsageManager {
  constructor() {
    this.db = db;
  }

  async checkDailyUsage(userId) {
    const today = new Date().toISOString().split('T')[0];
    const usageRef = this.db.collection('usage').doc(`${userId}_${today}`);
    const usageDoc = await usageRef.get();

    if (!usageDoc.exists) {
      return { count: 0, limit: this.getUserLimit(userId) };
    }

    return usageDoc.data();
  }

  async incrementUsage(userId) {
    const today = new Date().toISOString().split('T')[0];
    const usageRef = this.db.collection('usage').doc(`${userId}_${today}`);
    
    const userLimit = this.getUserLimit(userId);

    await this.db.runTransaction(async (transaction) => {
      const usageDoc = await transaction.get(usageRef);
      
      if (!usageDoc.exists) {
        transaction.set(usageRef, {
          userId,
          date: today,
          count: 1,
          limit: userLimit,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        const currentCount = usageDoc.data().count;
        if (currentCount >= userLimit) {
          throw new Error('Daily usage limit exceeded');
        }
        transaction.update(usageRef, {
          count: admin.firestore.FieldValue.increment(1),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    return await this.checkDailyUsage(userId);
  }

  getUserLimit(userId) {
    // In a real implementation, you would check the user's plan from Firestore
    // For now, using environment variables
    return parseInt(process.env.DAILY_VIDEO_LIMIT_FREE);
  }
}

// Initialize managers
const videoManager = new VideoGenerationManager();
const driveManager = new GoogleDriveManager();
const usageManager = new UsageManager();

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      firebase: 'connected',
      google_drive: 'connected',
      video_apis: videoManager.apis.map(api => api.name)
    }
  });
});

// Text to Video
app.post('/api/text-to-video', authenticateToken, videoGenerationLimiter, async (req, res) => {
  try {
    const { prompt, style = 'realistic', duration = 5, aspectRatio = '16:9', guidance = 7.5 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Check daily usage
    await usageManager.incrementUsage(req.user.uid);

    // Generate video
    const generationOptions = { style, duration, aspectRatio, guidance };
    const videoResult = await videoManager.generateVideoFromText(prompt, generationOptions);

    // Upload to Google Drive
    let videoUrl;
    if (videoResult.video_url || videoResult.video_data) {
      const videoBuffer = videoResult.video_data || 
        await this.downloadVideo(videoResult.video_url);
      
      const fileName = `video_${Date.now()}_${uuidv4()}.mp4`;
      const driveResult = await driveManager.uploadVideo(videoBuffer, req.user.uid, fileName);
      videoUrl = driveResult.directDownloadLink;
    } else {
      // If API returns a URL directly
      videoUrl = videoResult.video_url;
    }

    // Save to Firestore
    const videoData = {
      id: uuidv4(),
      userId: req.user.uid,
      prompt,
      style,
      duration,
      aspectRatio,
      guidance,
      videoUrl,
      driveFileId: driveResult?.fileId,
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('videos').doc(videoData.id).set(videoData);

    // Update user's total videos count
    await this.updateUserVideoCount(req.user.uid);

    res.json({
      success: true,
      videoId: videoData.id,
      videoUrl,
      message: 'Video generated successfully'
    });

  } catch (error) {
    console.error('Text-to-video error:', error);
    
    if (error.message.includes('usage limit')) {
      return res.status(429).json({ 
        error: error.message,
        limit: process.env.DAILY_VIDEO_LIMIT_FREE
      });
    }

    res.status(500).json({ 
      error: 'Failed to generate video',
      details: error.message 
    });
  }
});

// Image to Video
app.post('/api/image-to-video', authenticateToken, videoGenerationLimiter, upload.single('image'), async (req, res) => {
  try {
    const { prompt, style = 'realistic', duration = 5, aspectRatio = '16:9', guidance = 7.5 } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Check daily usage
    await usageManager.incrementUsage(req.user.uid);

    // Generate video from image
    const generationOptions = { style, duration, aspectRatio, guidance };
    const videoResult = await videoManager.generateVideoFromImage(
      req.file.buffer, 
      prompt, 
      generationOptions
    );

    // Upload to Google Drive
    let videoUrl;
    if (videoResult.video_url || videoResult.video_data) {
      const videoBuffer = videoResult.video_data || 
        await this.downloadVideo(videoResult.video_url);
      
      const fileName = `video_${Date.now()}_${uuidv4()}.mp4`;
      const driveResult = await driveManager.uploadVideo(videoBuffer, req.user.uid, fileName);
      videoUrl = driveResult.directDownloadLink;
    } else {
      videoUrl = videoResult.video_url;
    }

    // Save to Firestore
    const videoData = {
      id: uuidv4(),
      userId: req.user.uid,
      prompt,
      style,
      duration,
      aspectRatio,
      guidance,
      originalImage: {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      videoUrl,
      driveFileId: driveResult?.fileId,
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('videos').doc(videoData.id).set(videoData);

    // Update user's total videos count
    await this.updateUserVideoCount(req.user.uid);

    res.json({
      success: true,
      videoId: videoData.id,
      videoUrl,
      message: 'Video generated successfully from image'
    });

  } catch (error) {
    console.error('Image-to-video error:', error);
    
    if (error.message.includes('usage limit')) {
      return res.status(429).json({ 
        error: error.message,
        limit: process.env.DAILY_VIDEO_LIMIT_FREE
      });
    }

    res.status(500).json({ 
      error: 'Failed to generate video from image',
      details: error.message 
    });
  }
});

// Get user videos
app.get('/api/user/videos', authenticateToken, async (req, res) => {
  try {
    const videosSnapshot = await db.collection('videos')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const videos = [];
    videosSnapshot.forEach(doc => {
      videos.push({ id: doc.id, ...doc.data() });
    });

    res.json({ videos });
  } catch (error) {
    console.error('Error fetching user videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Get usage information
app.get('/api/user/usage', authenticateToken, async (req, res) => {
  try {
    const usage = await usageManager.checkDailyUsage(req.user.uid);
    
    // Get user's total video count
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const totalVideos = userDoc.exists ? userDoc.data().totalVideos || 0 : 0;

    res.json({
      dailyUsage: usage.count,
      dailyLimit: usage.limit,
      totalVideos,
      plan: 'free' // In real implementation, get from user document
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage information' });
  }
});

// Utility methods
app.prototype.downloadVideo = async function(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error downloading video:', error);
    throw new Error('Failed to download generated video');
  }
};

app.prototype.updateUserVideoCount = async function(userId) {
  try {
    const userRef = db.collection('users').doc(userId);
    
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (userDoc.exists) {
        transaction.update(userRef, {
          totalVideos: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        transaction.set(userRef, {
          totalVideos: 1,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });
  } catch (error) {
    console.error('Error updating user video count:', error);
  }
};

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 WebBurns AI Video Studio server running on port ${PORT}`);
  console.log(`📊 Available video APIs: ${videoManager.apis.map(api => api.name).join(', ')}`);
  console.log(`💾 Storage: Google Drive`);
  console.log(`🔐 Authentication: Firebase`);
});

module.exports = app;
