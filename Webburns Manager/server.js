const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getDatabase, ref, set, push, onValue, get, update } = require('firebase/database');
const { getStorage, ref: storageRef, uploadBytes, getDownloadURL } = require('firebase/storage');
const { Resend } = require('resend');
const http = require('http');
const socketIo = require('socket.io');
const WebRTC = require('wrtc');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Firebase Configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const database = getDatabase(firebaseApp);
const storage = getStorage(firebaseApp);

// Resend Configuration
const resend = new Resend(process.env.RESEND_API_KEY);

const MistralClient = require('@mistralai/mistralai').default;
// Initialize Mistral client
const mistral = new MistralClient(process.env.MISTRAL_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/webburns-manager', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  userID: { type: String, unique: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  firebaseUID: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  stats: {
    linesOfCode: { type: Number, default: 0 },
    commitCount: { type: Number, default: 0 },
    activeHours: { type: Number, default: 0 },
    projectsCompleted: { type: Number, default: 0 }
  }
});

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['active', 'pending', 'completed'], default: 'active' },
  dueDate: { type: Date },
  files: [{
    name: String,
    url: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: String,
  type: { type: String, enum: ['text', 'file', 'image'], default: 'text' },
  fileUrl: String,
  timestamp: { type: Date, default: Date.now }
});

const aiAssistantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  query: String,
  response: String,
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  timestamp: { type: Date, default: Date.now }
});

const codeSessionSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  content: String,
  language: { type: String, default: 'javascript' },
  lastModified: { type: Date, default: Date.now },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Models = {
  User: mongoose.model('User', userSchema),
  Project: mongoose.model('Project', projectSchema),
  Chat: mongoose.model('Chat', chatSchema),
  AIAssistant: mongoose.model('AIAssistant', aiAssistantSchema),
  CodeSession: mongoose.model('CodeSession', codeSessionSchema)
};

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      // More specific error handling
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ error: 'Invalid token' });
      } else {
        return res.status(403).json({ error: 'Token verification failed' });
      }
    }
    req.user = user;
    next();
  });
};

// Admin Middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// File Upload Configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Utility Functions
const generateUserID = (username) => {
  return `WBT-${username.replace(/\s+/g, '')}`;
};

const sendEmail = async (to, subject, html) => {
  try {
    await resend.emails.send({
      from: 'Webburns Manager <noreply@webburnstech.dev>',
      to,
      subject,
      html
    });
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

// API Routes

// User Registration - FIXED VERSION
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if user already exists in MongoDB FIRST
    const existingUser = await Models.User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    let firebaseUser;
    try {
      // Create user in Firebase Auth
      firebaseUser = await createUserWithEmailAndPassword(auth, email, password);
    } catch (firebaseError) {
      console.error('Firebase registration error:', firebaseError);
      
      // If Firebase fails but user doesn't exist in MongoDB, it's a fresh registration
      if (firebaseError.code === 'auth/email-already-in-use') {
        // Check if we have a record in MongoDB
        const mongoUser = await Models.User.findOne({ email });
        if (!mongoUser) {
          // Firebase has user but MongoDB doesn't - fix the inconsistency
          return res.status(400).json({ error: 'Email already in use. Please try logging in or use a different email.' });
        } else {
          return res.status(400).json({ error: 'User already exists' });
        }
      }
      
      return res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
    
    // Create user in MongoDB with pending status
    const newUser = new Models.User({
      email,
      username,
      firebaseUID: firebaseUser.user.uid,
      status: 'pending',
      userID: generateUserID(username) // Generate ID immediately but user can't login until approved
    });

    await newUser.save();

    // Send email to admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@webburns.com';
    await sendEmail(
      adminEmail,
      'New User Registration Approval Required',
      `
      <h2>New User Registration</h2>
      <p><strong>Username:</strong> ${username}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p>Please review and approve this user in the Admin Portal.</p>
      <a href="${process.env.ADMIN_PORTAL_URL}">Go to Admin Portal</a>
      `
    );
    
    console.log('✅ New user registered successfully:', email);
    
    res.status(201).json({ 
      message: 'Registration successful. Waiting for admin approval.',
      user: { email, username, status: 'pending' }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // If MongoDB save fails but Firebase user was created, delete the Firebase user
    if (firebaseUser) {
      try {
        await firebaseUser.user.delete();
      } catch (deleteError) {
        console.error('Failed to cleanup Firebase user:', deleteError);
      }
    }
    
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Authenticate with Firebase
    const firebaseUser = await signInWithEmailAndPassword(auth, email, password);
    
    // Find user in MongoDB
    const user = await Models.User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({ 
        error: 'Account pending approval',
        status: user.status 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
        userID: user.userID 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        userID: user.userID,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Invalid credentials' });
     if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'User not found' });
    } else if (error.code === 'auth/wrong-password') {
      return res.status(401).json({ error: 'Invalid password' });
    } else if (error.code === 'auth/too-many-requests') {
      return res.status(429).json({ error: 'Too many failed attempts. Please try again later.' });
    } else {
      return res.status(500).json({ error: 'Login failed. Please try again.' });
    }
  }
});

// Admin Routes

// Get pending users
app.get('/api/admin/pending-users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pendingUsers = await Models.User.find({ status: 'pending' });
    res.json(pendingUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

// Add a token refresh endpoint
app.post('/api/auth/refresh', authenticateToken, (req, res) => {
  // Generate new token with same user data
  const token = jwt.sign(
    { 
      userId: req.user.userId, 
      email: req.user.email, 
      role: req.user.role,
      userID: req.user.userID 
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );

  res.json({ token });
});

// Approve user
app.post('/api/admin/approve-user/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await Models.User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate user ID
    const userID = generateUserID(user.username);
    
    // Update user status and ID
    user.status = 'approved';
    user.userID = userID;
    await user.save();

    // Send approval email to user
    await sendEmail(
      user.email,
      'Your Webburns Manager Account Has Been Approved!',
      `
      <h2>Account Approved</h2>
      <p>Your Webburns Manager account has been approved by the administrator.</p>
      <p><strong>Your User ID:</strong> ${userID}</p>
      <p>You can now log in to your account and start working on projects.</p>
      <a href="${process.env.USER_PORTAL_URL}">Login to User Portal</a>
      `
    );

    res.json({ message: 'User approved successfully', userID });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// Create project
app.post('/api/admin/projects', authenticateToken, requireAdmin, upload.array('files'), async (req, res) => {
  try {
    const { title, description, assignedUsers, dueDate } = req.body;
    const adminId = req.user.userId;

    // Parse assigned users
    const assignedUserIds = assignedUsers ? JSON.parse(assignedUsers) : [];

    // Upload files to Firebase Storage
    const files = [];
    if (req.files) {
      for (const file of req.files) {
        const fileRef = storageRef(storage, `projects/${Date.now()}-${file.originalname}`);
        await uploadBytes(fileRef, file.buffer);
        const downloadURL = await getDownloadURL(fileRef);
        
        files.push({
          name: file.originalname,
          url: downloadURL,
          uploadedBy: adminId
        });
      }
    }

    const project = new Models.Project({
      title,
      description,
      adminId,
      assignedUsers: assignedUserIds,
      dueDate,
      files
    });

    await project.save();

    // Store project in Firebase for real-time features
    const projectRef = ref(database, `projects/${project._id}`);
    await set(projectRef, {
      title,
      description,
      createdAt: new Date().toISOString()
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Project creation error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// User Routes

// Get user dashboard
app.get('/api/user/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's assigned projects
    const projects = await Models.Project.find({ 
      assignedUsers: userId 
    }).populate('assignedUsers', 'username userID');

    // Get user stats
    const user = await Models.User.findById(userId);
    
    // Get leaderboard data
    const leaderboard = await Models.User.find({ status: 'approved' })
      .sort({ 'stats.linesOfCode': -1 })
      .limit(10)
      .select('username userID stats.linesOfCode stats.commitCount');

    res.json({
      projects,
      stats: user.stats,
      leaderboard,
      user: {
        username: user.username,
        userID: user.userID,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// AI Assistant
app.post('/api/ai/assist', authenticateToken, async (req, res) => {
  try {
    const { query, projectId } = req.body;
    const userId = req.user.userId;

    // Call Mistral AI API
    const chatResponse = await mistral.chat({
      model: 'mistral-medium',
      messages: [{ role: 'user', content: query }],
    });

    const aiResponse = chatResponse.choices[0].message.content;

    // Log the interaction
    const aiLog = new Models.AIAssistant({
      userId,
      query,
      response: aiResponse,
      projectId
    });
    await aiLog.save();

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('AI Assistant error:', error);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

// Project Chat
app.get('/api/projects/:projectId/chat', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const messages = await Models.Chat.find({ projectId })
      .populate('userId', 'username userID')
      .sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load chat messages' });
  }
});

// File Upload for Chat
app.post('/api/projects/:projectId/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Upload to Firebase Storage
    const fileRef = storageRef(storage, `chat/${projectId}/${Date.now()}-${req.file.originalname}`);
    await uploadBytes(fileRef, req.file.buffer);
    const downloadURL = await getDownloadURL(fileRef);

    // Save to MongoDB
    const chatMessage = new Models.Chat({
      projectId,
      userId,
      message: req.file.originalname,
      type: 'file',
      fileUrl: downloadURL
    });
    await chatMessage.save();

    // Broadcast to Firebase Realtime DB
    const chatRef = ref(database, `projects/${projectId}/chat`);
    const newMessageRef = push(chatRef);
    await set(newMessageRef, {
      userId,
      username: req.user.username,
      message: req.file.originalname,
      type: 'file',
      fileUrl: downloadURL,
      timestamp: new Date().toISOString()
    });

    res.json({ url: downloadURL, message: 'File uploaded successfully' });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Update User Stats
app.post('/api/user/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { linesOfCode, commitCount, activeHours } = req.body;

    const updateData = {};
    if (linesOfCode) updateData['stats.linesOfCode'] = linesOfCode;
    if (commitCount) updateData['stats.commitCount'] = commitCount;
    if (activeHours) updateData['stats.activeHours'] = activeHours;

    await Models.User.findByIdAndUpdate(userId, { $set: updateData });

    res.json({ message: 'Stats updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stats' });
  }
});

// Admin Login Route
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin user
    const adminUser = await Models.User.findOne({ 
      email, 
      role: 'admin',
      status: 'approved'
    });

    if (!adminUser) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Verify password (you might want to implement password hashing)
    // For now, using a simple check - in production use bcrypt
    // const isValidPassword = await bcrypt.compare(password, adminUser.passwordHash);
    const isValidPassword = (password === '12345678');
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    adminUser.lastLogin = new Date();
    await adminUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: adminUser._id, 
        email: adminUser.email, 
        role: adminUser.role,
        userID: adminUser.userID 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' } // Shorter expiry for admin tokens
    );

    res.json({
      token,
      user: {
        id: adminUser._id,
        email: adminUser.email,
        username: adminUser.username,
        userID: adminUser.userID,
        role: adminUser.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Token verification endpoint (already exists)
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: req.user 
  });
});

// Cleanup function for inconsistent data
app.post('/api/admin/cleanup-users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const allUsers = await Models.User.find({});
    let fixedCount = 0;
    
    for (const user of allUsers) {
      try {
        // Check if Firebase user exists
        const firebaseUser = await auth.getUserByEmail(user.email);
        
        // If Firebase user exists but MongoDB doesn't have firebaseUID, update it
        if (firebaseUser && !user.firebaseUID) {
          user.firebaseUID = firebaseUser.uid;
          await user.save();
          fixedCount++;
        }
      } catch (error) {
        // Firebase user doesn't exist - this is an inconsistent record
        if (error.code === 'auth/user-not-found') {
          console.log(`Deleting inconsistent user: ${user.email}`);
          await Models.User.findByIdAndDelete(user._id);
          fixedCount++;
        }
      }
    }
    
    res.json({ message: `Cleanup completed. Fixed ${fixedCount} user records.` });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

// Debug route to check user data
app.get('/api/debug/users', async (req, res) => {
  try {
    const mongoUsers = await Models.User.find({});
    const usersWithDetails = [];
    
    for (const user of mongoUsers) {
      let firebaseExists = false;
      try {
        await auth.getUserByEmail(user.email);
        firebaseExists = true;
      } catch (error) {
        firebaseExists = false;
      }
      
      usersWithDetails.push({
        email: user.email,
        username: user.username,
        status: user.status,
        firebaseUID: user.firebaseUID,
        firebaseExists: firebaseExists,
        consistent: !!(user.firebaseUID && firebaseExists)
      });
    }
    
    res.json(usersWithDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Real-time Code Editor with Socket.io
const codeSessions = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join code editing session
  socket.on('join-code-session', async (data) => {
    const { projectId } = data;
    socket.join(`project-${projectId}`);

    // Get or create code session
    let codeSession = codeSessions.get(projectId);
    if (!codeSession) {
      const dbSession = await Models.CodeSession.findOne({ projectId });
      codeSession = dbSession || { content: '', language: 'javascript' };
      codeSessions.set(projectId, codeSession);
    }

    socket.emit('code-update', codeSession);
  });

  // Handle code changes
  socket.on('code-change', (data) => {
    const { projectId, content, language, userId } = data;
    
    const codeSession = codeSessions.get(projectId) || { content: '', language: 'javascript' };
    codeSession.content = content;
    codeSession.language = language;
    codeSession.lastModified = new Date();
    codeSession.lastModifiedBy = userId;

    codeSessions.set(projectId, codeSession);

    // Broadcast to other users in the same project
    socket.to(`project-${projectId}`).emit('code-update', codeSession);
  });

  // Commit code changes
  socket.on('commit-code', async (data) => {
    const { projectId, userId } = data;
    const codeSession = codeSessions.get(projectId);

    if (codeSession) {
      // Save to MongoDB
      await Models.CodeSession.findOneAndUpdate(
        { projectId },
        {
          content: codeSession.content,
          language: codeSession.language,
          lastModified: new Date(),
          lastModifiedBy: userId
        },
        { upsert: true }
      );

      // Update user stats
      const linesOfCode = codeSession.content.split('\n').length;
      await Models.User.findByIdAndUpdate(userId, {
        $inc: { 
          'stats.linesOfCode': linesOfCode,
          'stats.commitCount': 1 
        }
      });

      // Save to Firebase Storage as backup
      const fileRef = storageRef(storage, `code-backups/${projectId}/${Date.now()}.${codeSession.language}`);
      const blob = new Blob([codeSession.content], { type: 'text/plain' });
      await uploadBytes(fileRef, blob);

      socket.emit('commit-success', { message: 'Code committed successfully' });
    }
  });

  // WebRTC signaling
  socket.on('webrtc-offer', (data) => {
    socket.to(data.target).emit('webrtc-offer', {
      offer: data.offer,
      sender: socket.id
    });
  });

  socket.on('webrtc-answer', (data) => {
    socket.to(data.target).emit('webrtc-answer', {
      answer: data.answer,
      sender: socket.id
    });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    socket.to(data.target).emit('webrtc-ice-candidate', {
      candidate: data.candidate,
      sender: socket.id
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Get project code session
app.get('/api/projects/:projectId/code', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    let codeSession = codeSessions.get(projectId);
    if (!codeSession) {
      codeSession = await Models.CodeSession.findOne({ projectId });
      if (codeSession) {
        codeSessions.set(projectId, codeSession);
      }
    }

    res.json(codeSession || { content: '', language: 'javascript' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load code session' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Webburns Manager server running on port ${PORT}`);
});

module.exports = app;
