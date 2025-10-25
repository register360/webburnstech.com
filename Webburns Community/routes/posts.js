const express = require('express');
const admin = require('firebase-admin');
const { authenticate } = require('./middleware/auth');
const { validatePost, validateComment } = require('./middleware/validation');

const router = express.Router();

// GET /api/posts - Get feed posts with pagination
router.get('/', authenticate, async (req, res) => {
    try {
        const { lastVisible, limit = 10 } = req.query;
        
        let query = admin.firestore()
            .collection('posts')
            .where('visibility', 'in', ['public', 'followers'])
            .orderBy('createdAt', 'desc')
            .limit(parseInt(limit));

        // Handle pagination
        if (lastVisible && lastVisible !== 'null') {
            const lastDoc = await admin.firestore()
                .collection('posts')
                .doc(lastVisible)
                .get();
                
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            }
        }

        const snapshot = await query.get();
        
        if (snapshot.empty) {
            return res.json({
                success: true,
                posts: [],
                lastVisible: null,
                hasMore: false
            });
        }

        const posts = [];
        const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];

        // Get user data for each post
        for (const doc of snapshot.docs) {
            const postData = doc.data();
            
            // Get user information
            const userDoc = await admin.firestore()
                .collection('users')
                .doc(postData.userId)
                .get();

            const userData = userDoc.exists ? userDoc.data() : {};

            posts.push({
                id: doc.id,
                ...postData,
                user: {
                    uid: postData.userId,
                    name: userData.name || 'Unknown User',
                    username: userData.username,
                    avatarURL: userData.avatarURL
                },
                // Convert Firestore timestamp to ISO string
                createdAt: postData.createdAt?.toDate?.() || postData.createdAt,
                updatedAt: postData.updatedAt?.toDate?.() || postData.updatedAt
            });
        }

        res.json({
            success: true,
            posts,
            lastVisible: lastVisibleDoc.id,
            hasMore: snapshot.docs.length === parseInt(limit)
        });

    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch posts'
        });
    }
});

// POST /api/posts/new - Create new post
router.post('/new', authenticate, validatePost, async (req, res) => {
    try {
        const { content, imageURL, visibility = 'public' } = req.body;
        const userId = req.user.uid;

        // Check if user exists
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const postData = {
            userId,
            content: content.trim(),
            imageURL: imageURL || '',
            visibility,
            likes: [],
            comments: [],
            likesCount: 0,
            commentsCount: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Add post to Firestore
        const postRef = await admin.firestore().collection('posts').add(postData);
        
        // Update user's post count
        await admin.firestore()
            .collection('users')
            .doc(userId)
            .update({
                postsCount: admin.firestore.FieldValue.increment(1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

        // Store in MongoDB for analytics
        if (process.env.USE_MONGODB === 'true') {
            const PostAnalytics = require('../models/PostAnalytics');
            await PostAnalytics.create({
                postId: postRef.id,
                userId,
                contentLength: content.length,
                hasImage: !!imageURL,
                visibility,
                createdAt: new Date()
            });
        }

        // Get the created post with user data
        const createdPost = {
            id: postRef.id,
            ...postData,
            user: {
                uid: userId,
                name: userDoc.data().name,
                username: userDoc.data().username,
                avatarURL: userDoc.data().avatarURL
            },
            createdAt: new Date()
        };

        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            post: createdPost,
            postId: postRef.id
        });

    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create post'
        });
    }
});

// GET /api/posts/:postId - Get single post
router.get('/:postId', authenticate, async (req, res) => {
    try {
        const { postId } = req.params;

        const postDoc = await admin.firestore()
            .collection('posts')
            .doc(postId)
            .get();

        if (!postDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        const postData = postDoc.data();

        // Get user information
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(postData.userId)
            .get();

        const userData = userDoc.exists ? userDoc.data() : {};

        const post = {
            id: postDoc.id,
            ...postData,
            user: {
                uid: postData.userId,
                name: userData.name || 'Unknown User',
                username: userData.username,
                avatarURL: userData.avatarURL
            },
            createdAt: postData.createdAt?.toDate?.() || postData.createdAt,
            updatedAt: postData.updatedAt?.toDate?.() || postData.updatedAt
        };

        res.json({
            success: true,
            post
        });

    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch post'
        });
    }
});

// POST /api/posts/:postId/like - Like/unlike a post
router.post('/:postId/like', authenticate, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.uid;

        const postRef = admin.firestore().collection('posts').doc(postId);
        const postDoc = await postRef.get();

        if (!postDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        const postData = postDoc.data();
        const likes = postData.likes || [];
        const isLiked = likes.includes(userId);

        let updatedLikes;
        
        if (isLiked) {
            // Unlike: remove user from likes array
            updatedLikes = likes.filter(id => id !== userId);
        } else {
            // Like: add user to likes array
            updatedLikes = [...likes, userId];
            
            // Create notification for post owner (if not liking own post)
            if (postData.userId !== userId) {
                await createNotification({
                    userId: postData.userId,
                    type: 'like',
                    message: `${req.user.name} liked your post`,
                    triggerUserId: userId,
                    postId: postId,
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        await postRef.update({
            likes: updatedLikes,
            likesCount: updatedLikes.length,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update MongoDB analytics
        if (process.env.USE_MONGODB === 'true') {
            const UserStats = require('../models/UserStats');
            await UserStats.findOneAndUpdate(
                { userId: postData.userId },
                { 
                    $inc: { likesCount: isLiked ? -1 : 1 }
                }
            );
        }

        res.json({
            success: true,
            liked: !isLiked,
            likes: updatedLikes,
            likesCount: updatedLikes.length
        });

    } catch (error) {
        console.error('Like post error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to like post'
        });
    }
});

// POST /api/posts/:postId/comment - Add comment to post
router.post('/:postId/comment', authenticate, validateComment, async (req, res) => {
    try {
        const { postId } = req.params;
        const { text } = req.body;
        const userId = req.user.uid;

        const postRef = admin.firestore().collection('posts').doc(postId);
        const postDoc = await postRef.get();

        if (!postDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        const postData = postDoc.data();

        // Get user information
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(userId)
            .get();

        const userData = userDoc.exists ? userDoc.data() : {};

        const comment = {
            id: `comment_${Date.now()}`,
            userId,
            userName: userData.name || 'Unknown User',
            userAvatar: userData.avatarURL,
            text: text.trim(),
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };

        const currentComments = postData.comments || [];
        const updatedComments = [...currentComments, comment];

        await postRef.update({
            comments: updatedComments,
            commentsCount: updatedComments.length,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create notification for post owner (if not commenting on own post)
        if (postData.userId !== userId) {
            await createNotification({
                userId: postData.userId,
                type: 'comment',
                message: `${userData.name} commented on your post`,
                triggerUserId: userId,
                postId: postId,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // Update MongoDB analytics
        if (process.env.USE_MONGODB === 'true') {
            const UserStats = require('../models/UserStats');
            await UserStats.findOneAndUpdate(
                { userId: postData.userId },
                { 
                    $inc: { commentsCount: 1 }
                }
            );
        }

        res.json({
            success: true,
            message: 'Comment added successfully',
            comment,
            comments: updatedComments
        });

    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add comment'
        });
    }
});

// DELETE /api/posts/:postId/delete - Delete post
router.delete('/:postId/delete', authenticate, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.uid;

        const postDoc = await admin.firestore()
            .collection('posts')
            .doc(postId)
            .get();

        if (!postDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        const postData = postDoc.data();

        // Check if user owns the post
        if (postData.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this post'
            });
        }

        // Delete post
        await admin.firestore()
            .collection('posts')
            .doc(postId)
            .delete();

        // Update user's post count
        await admin.firestore()
            .collection('users')
            .doc(userId)
            .update({
                postsCount: admin.firestore.FieldValue.increment(-1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

        res.json({
            success: true,
            message: 'Post deleted successfully'
        });

    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete post'
        });
    }
});

// GET /api/posts/:postId/comments - Get post comments
router.get('/:postId/comments', authenticate, async (req, res) => {
    try {
        const { postId } = req.params;

        const postDoc = await admin.firestore()
            .collection('posts')
            .doc(postId)
            .get();

        if (!postDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        const postData = postDoc.data();
        const comments = postData.comments || [];

        res.json({
            success: true,
            comments
        });

    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch comments'
        });
    }
});

// Helper function to create notifications
async function createNotification(notificationData) {
    try {
        await admin.firestore()
            .collection('notifications')
            .add(notificationData);
    } catch (error) {
        console.error('Create notification error:', error);
    }
}

module.exports = router;
