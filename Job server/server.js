const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs');

// Initialize Express app
const app = express();

// Middleware
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
};
app.use(cors());
app.use(express.json());

// Updated MongoDB Connection
mongoose.connect('mongodb+srv://vinay:vinay1234567@cluster0.uxcfxxy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Define Mongoose Schemas
const educationSchema = new mongoose.Schema({
    level: { type: String, required: true },
    institution: { type: String, required: true },
    fieldOfStudy: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    percentage: { type: String, required: true }
});

const applicationSchema = new mongoose.Schema({
    personalInfo: {
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
        country: { type: String, required: true }
    },
    education: [educationSchema],
    jobInfo: {
        position: { type: String, required: true },
        hearAbout: { type: String, required: true },
        portfolioLink: { type: String },
        additionalInfo: { type: String },
        resumePath: { type: String, required: true },
        coverLetterPath: { type: String }
    },
    applicationDate: { type: Date, default: Date.now }
});

const Application = mongoose.model('Application', applicationSchema);

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /pdf|doc|docx/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only PDF and Word documents are allowed!'));
        }
    }
});

// Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'webburnstech@gmail.com',
        pass: 'xtqwmrnfvlrynsoz'
    }
});

// Application submission endpoint
app.post('/api/applications', upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 }
]), async (req, res) => {
    try {
        // Parse the JSON data from the form
        const personalInfo = JSON.parse(req.body.personalInfo);
        const education = JSON.parse(req.body.education);
        const documents = JSON.parse(req.body.documents);

        // Get file paths
        const resumePath = req.files['resume'] ? req.files['resume'][0].path : null;
        const coverLetterPath = req.files['coverLetter'] ? req.files['coverLetter'][0].path : null;

        if (!resumePath) {
            return res.status(400).json({ error: 'Resume is required' });
        }

        // Create new application document
        const newApplication = new Application({
            personalInfo,
            education,
            jobInfo: {
                position: documents.position,
                hearAbout: documents.hearAbout,
                portfolioLink: documents.portfolioLink,
                additionalInfo: documents.additionalInfo,
                resumePath,
                coverLetterPath
            }
        });

        // Save to database
        const savedApplication = await newApplication.save();

        // Send confirmation email
        const mailOptions = {
            from: '"Webburns Tech" <webburnstech@gmail.com>',
            to: personalInfo.email,
            subject: 'Your Application Has Been Received',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c3e50;">
    <h2 style="color: #2c3e50;">Thank you for applying to Webburns Tech!</h2>
    <p>Dear ${personalInfo.firstName} ${personalInfo.lastName},</p>
    <p>We are pleased to inform you that we have received your application for the <strong>${documents.position}</strong> role at <strong>Webburns Tech</strong>.</p>
    <p><h3>Your unique application reference ID is: <strong>${savedApplication._id}</strong><h3>. Please keep this ID for future correspondence.</p>
    <p>Our hiring team is currently reviewing all applications. If your qualifications match our current requirements, we will reach out to you for the next steps in the selection process. This may include a technical assessment, interview, or further documentation.</p>
    <p>We appreciate the time and effort you took to apply and your interest in joining our innovative and growing team. At Webburns Tech, we value passion, creativity, and dedication, and we’re excited to learn more about what you bring to the table.</p>
    <p>If you have any questions, feel free to contact us via our <a href="https://webburnstech.com/contact" style="color: #2980b9;">Contact Page</a>.</p>
    <br>
    <p>Warm regards,</p>
    <p><strong>The Webburns Tech Recruitment Team</strong></p>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <small style="color: #7f8c8d;">
            This is an automated message. Please do not reply directly to this email.<br>
            For assistance, visit <a href="https://webburnstech.com/support" style="color: #95a5a6;">Support</a>.
        </small>
    </div>
</div>
            `
        };

        await transporter.sendMail(mailOptions);

        // Send success response
        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            applicationId: savedApplication._id,
            firstName: personalInfo.firstName
        });

    } catch (error) {
        console.error('Error submitting application:', error);
        
        // Clean up uploaded files if there was an error
        if (req.files) {
            Object.values(req.files).forEach(fileArray => {
                fileArray.forEach(file => {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
            });
        }

        res.status(500).json({ 
            error: 'An error occurred while processing your application',
            details: error.message 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        return res.status(400).json({ 
            error: 'File upload error',
            details: err.message 
        });
    } else if (err) {
        // An unknown error occurred
        return res.status(500).json({ 
            error: 'Internal server error',
            details: err.message 
        });
    }
    
    next();
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
