require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vinay:vinay1234567@cluster0.uxcfxxy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI);

.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Define Application Schema
const applicationSchema = new mongoose.Schema({
    // Personal Information
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    fatherName: { type: String, required: true },
    motherName: { type: String, required: true },
    dob: { type: Date, required: true },
    gender: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
    
    // Education
    education: [{
        level: { type: String, required: true },
        institution: { type: String, required: true },
        fieldOfStudy: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        percentage: { type: String, required: true }
    }],
    
    // Documents
    position: { type: String, required: true },
    hearAbout: { type: String, required: true },
    resume: { type: String, required: true },
    coverLetter: { type: String },
    portfolioLink: { type: String },
    additionalInfo: { type: String },
    
    // Metadata
    submissionDate: { type: Date, default: Date.now },
    status: { type: String, default: 'Pending' }
});

const Application = mongoose.model('Application', applicationSchema);

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 }
]);

// API Endpoint to handle form submission
app.post('/api/applications', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size exceeds 5MB limit' });
            }
            return res.status(500).json({ error: 'File upload error' });
        }

        try {
            const { personalInfo, education, documents } = req.body;
            
            // Parse the JSON strings if they were sent as strings
            const personalData = typeof personalInfo === 'string' ? JSON.parse(personalInfo) : personalInfo;
            const educationData = typeof education === 'string' ? JSON.parse(education) : education;
            const documentsData = typeof documents === 'string' ? JSON.parse(documents) : documents;

            // Create new application
            const newApplication = new Application({
                ...personalData,
                education: educationData,
                ...documentsData,
                resume: req.files['resume'] ? req.files['resume'][0].path : null,
                coverLetter: req.files['coverLetter'] ? req.files['coverLetter'][0].path : null
            });

            await newApplication.save();
            
            res.status(201).json({ 
                message: 'Application submitted successfully',
                applicationId: newApplication._id
            });
        } catch (error) {
            console.error('Error saving application:', error);
            res.status(500).json({ error: 'Failed to submit application' });
        }
    });
});

// Serve static files (for uploaded documents)
app.use('/uploads', express.static('uploads'));

// Basic route for testing
app.get('/', (req, res) => {
    res.send('Webburns Tech Job Application API');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
