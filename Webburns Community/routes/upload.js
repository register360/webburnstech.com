const express = require('express');
const admin = require('firebase-admin');
const multer = require('multer');
const { authenticate } = require('./middleware/auth');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Check file type
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// POST /api/upload - Upload file to Firebase Storage
router.post('/', authenticate, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const file = req.file;
        const userId = req.user.uid;
        
        // Validate file size
        if (file.size > 5 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                error: 'File size must be less than 5MB'
            });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `uploads/${userId}/${timestamp}.${fileExtension}`;

        // Create file reference
        const fileRef = admin.storage().bucket().file(fileName);

        // Create file metadata
        const metadata = {
            contentType: file.mimetype,
            metadata: {
                uploadedBy: userId,
                originalName: file.originalname,
                uploadDate: new Date().toISOString()
            }
        };

        // Upload file to Firebase Storage
        await fileRef.save(file.buffer, {
            metadata: metadata,
            public: true
        });

        // Make the file publicly accessible
        await fileRef.makePublic();

        // Get public URL
        const publicUrl = `https://storage.googleapis.com/${admin.storage().bucket().name}/${fileName}`;

        // Store file metadata in Firestore
        const fileMetadata = {
            fileName: file.originalname,
            fileUrl: publicUrl,
            fileSize: file.size,
            fileType: file.mimetype,
            uploadedBy: userId,
            uploadDate: admin.firestore.FieldValue.serverTimestamp(),
            isPublic: true
        };

        await admin.firestore()
            .collection('uploads')
            .add(fileMetadata);

        res.json({
            success: true,
            message: 'File uploaded successfully',
            file: {
                url: publicUrl,
                name: file.originalname,
                size: file.size,
                type: file.mimetype
            }
        });

    } catch (error) {
        console.error('Upload error:', error);
        
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    error: 'File size must be less than 5MB'
                });
            }
        }

        res.status(500).json({
            success: false,
            error: 'Failed to upload file'
        });
    }
});

// POST /api/upload/base64 - Upload base64 image
router.post('/base64', authenticate, async (req, res) => {
    try {
        const { base64Image, fileName = `image_${Date.now()}.jpg` } = req.body;

        if (!base64Image) {
            return res.status(400).json({
                success: false,
                error: 'Base64 image data is required'
            });
        }

        const userId = req.user.uid;

        // Validate base64 string
        const base64Regex = /^data:image\/([a-zA-Z]*);base64,([^\"]*)$/;
        const matches = base64Image.match(base64Regex);

        if (!matches) {
            return res.status(400).json({
                success: false,
                error: 'Invalid base64 image format'
            });
        }

        const imageType = matches[1];
        const base64Data = matches[2];

        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64');

        // Validate file size (5MB limit)
        if (buffer.length > 5 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                error: 'Image size must be less than 5MB'
            });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = imageType === 'jpeg' ? 'jpg' : imageType;
        const storageFileName = `uploads/${userId}/${timestamp}.${fileExtension}`;

        // Create file reference
        const fileRef = admin.storage().bucket().file(storageFileName);

        // Upload to Firebase Storage
        await fileRef.save(buffer, {
            metadata: {
                contentType: `image/${imageType}`,
                metadata: {
                    uploadedBy: userId,
                    originalName: fileName,
                    uploadDate: new Date().toISOString(),
                    uploadedVia: 'base64'
                }
            },
            public: true
        });

        // Make the file publicly accessible
        await fileRef.makePublic();

        // Get public URL
        const publicUrl = `https://storage.googleapis.com/${admin.storage().bucket().name}/${storageFileName}`;

        // Store file metadata in Firestore
        const fileMetadata = {
            fileName: fileName,
            fileUrl: publicUrl,
            fileSize: buffer.length,
            fileType: `image/${imageType}`,
            uploadedBy: userId,
            uploadDate: admin.firestore.FieldValue.serverTimestamp(),
            isPublic: true,
            uploadedVia: 'base64'
        };

        await admin.firestore()
            .collection('uploads')
            .add(fileMetadata);

        res.json({
            success: true,
            message: 'Image uploaded successfully',
            imageUrl: publicUrl
        });

    } catch (error) {
        console.error('Base64 upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload image'
        });
    }
});

// POST /api/upload/avatar - Upload user avatar
router.post('/avatar', authenticate, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No avatar image uploaded'
            });
        }

        const file = req.file;
        const userId = req.user.uid;

        // Validate it's an image
        if (!file.mimetype.startsWith('image/')) {
            return res.status(400).json({
                success: false,
                error: 'Only image files are allowed for avatars'
            });
        }

        // Generate unique filename for avatar
        const timestamp = Date.now();
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `avatars/${userId}/${timestamp}.${fileExtension}`;

        // Create file reference
        const fileRef = admin.storage().bucket().file(fileName);

        // Upload to Firebase Storage
        await fileRef.save(file.buffer, {
            metadata: {
                contentType: file.mimetype,
                metadata: {
                    uploadedBy: userId,
                    uploadDate: new Date().toISOString(),
                    filePurpose: 'avatar'
                }
            },
            public: true
        });

        // Make the file publicly accessible
        await fileRef.makePublic();

        // Get public URL
        const avatarUrl = `https://storage.googleapis.com/${admin.storage().bucket().name}/${fileName}`;

        // Update user's avatar URL in Firestore
        await admin.firestore()
            .collection('users')
            .doc(userId)
            .update({
                avatarURL: avatarUrl,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

        res.json({
            success: true,
            message: 'Avatar uploaded successfully',
            avatarUrl: avatarUrl
        });

    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload avatar'
        });
    }
});

// DELETE /api/upload/:fileUrl - Delete uploaded file
router.delete('/:fileUrl', authenticate, async (req, res) => {
    try {
        const { fileUrl } = req.params;
        const userId = req.user.uid;

        if (!fileUrl) {
            return res.status(400).json({
                success: false,
                error: 'File URL is required'
            });
        }

        // Extract file path from URL
        const urlParts = fileUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `uploads/${userId}/${fileName}`;

        // Check if file exists and belongs to user
        const fileMetadata = await admin.firestore()
            .collection('uploads')
            .where('fileUrl', '==', fileUrl)
            .where('uploadedBy', '==', userId)
            .get();

        if (fileMetadata.empty) {
            return res.status(404).json({
                success: false,
                error: 'File not found or not authorized to delete'
            });
        }

        // Delete from Firebase Storage
        await admin.storage().bucket().file(filePath).delete();

        // Delete metadata from Firestore
        const batch = admin.firestore().batch();
        fileMetadata.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        res.json({
            success: true,
            message: 'File deleted successfully'
        });

    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete file'
        });
    }
});

// GET /api/upload/user - Get user's uploaded files
router.get('/user', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { limit = 20 } = req.query;

        const snapshot = await admin.firestore()
            .collection('uploads')
            .where('uploadedBy', '==', userId)
            .orderBy('uploadDate', 'desc')
            .limit(parseInt(limit))
            .get();

        const files = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            uploadDate: doc.data().uploadDate?.toDate?.() || doc.data().uploadDate
        }));

        res.json({
            success: true,
            files,
            count: files.length
        });

    } catch (error) {
        console.error('Get user files error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user files'
        });
    }
});

module.exports = router;
