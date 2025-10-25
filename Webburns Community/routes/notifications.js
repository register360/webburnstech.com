const express = require('express');
const admin = require('firebase-admin');
const { authenticate } = require('./middleware/auth');

const router = express.Router();

// GET /api/notifications/:uid - Get user notifications
router.get('/:uid', authenticate, async (req, res) => {
    try {
        const { uid } = req.params;
        const { limit = 20, unreadOnly = false } = req.query;

        // Verify user access
        if (uid !== req.user.uid) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to access these notifications'
            });
        }

        let query = admin.firestore()
            .collection('notifications')
            .where('userId', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(parseInt(limit));

        // Filter for unread only if requested
        if (unreadOnly === 'true') {
            query = query.where('read', '==', false);
        }

        const snapshot = await query.get();
        
        const notifications = [];
        let unreadCount = 0;

        for (const doc of snapshot.docs) {
            const notification = {
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
            };
            
            notifications.push(notification);
            
            if (!notification.read) {
                unreadCount++;
            }
        }

        res.json({
            success: true,
            notifications,
            unreadCount,
            totalCount: notifications.length
        });

    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notifications'
        });
    }
});

// POST /api/notifications/:notificationId/read - Mark notification as read
router.post('/:notificationId/read', authenticate, async (req, res) => {
    try {
        const { notificationId } = req.params;

        const notificationDoc = await admin.firestore()
            .collection('notifications')
            .doc(notificationId)
            .get();

        if (!notificationDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        const notification = notificationDoc.data();

        // Verify ownership
        if (notification.userId !== req.user.uid) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to modify this notification'
            });
        }

        // Mark as read
        await admin.firestore()
            .collection('notifications')
            .doc(notificationId)
            .update({
                read: true,
                readAt: admin.firestore.FieldValue.serverTimestamp()
            });

        res.json({
            success: true,
            message: 'Notification marked as read'
        });

    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark notification as read'
        });
    }
});

// POST /api/notifications/:uid/read-all - Mark all notifications as read
router.post('/:uid/read-all', authenticate, async (req, res) => {
    try {
        const { uid } = req.params;

        // Verify user access
        if (uid !== req.user.uid) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to access these notifications'
            });
        }

        // Get all unread notifications
        const snapshot = await admin.firestore()
            .collection('notifications')
            .where('userId', '==', uid)
            .where('read', '==', false)
            .get();

        if (snapshot.empty) {
            return res.json({
                success: true,
                message: 'No unread notifications',
                markedRead: 0
            });
        }

        // Batch update all notifications
        const batch = admin.firestore().batch();
        
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, {
                read: true,
                readAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();

        res.json({
            success: true,
            message: `Marked ${snapshot.size} notifications as read`,
            markedRead: snapshot.size
        });

    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark notifications as read'
        });
    }
});

// DELETE /api/notifications/:notificationId - Delete notification
router.delete('/:notificationId', authenticate, async (req, res) => {
    try {
        const { notificationId } = req.params;

        const notificationDoc = await admin.firestore()
            .collection('notifications')
            .doc(notificationId)
            .get();

        if (!notificationDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        const notification = notificationDoc.data();

        // Verify ownership
        if (notification.userId !== req.user.uid) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this notification'
            });
        }

        // Delete notification
        await admin.firestore()
            .collection('notifications')
            .doc(notificationId)
            .delete();

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });

    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete notification'
        });
    }
});

// POST /api/notifications/new - Create new notification (internal use)
router.post('/new', async (req, res) => {
    try {
        const { userId, type, message, triggerUserId, postId } = req.body;

        // Validate required fields
        if (!userId || !type || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userId, type, message'
            });
        }

        const notificationData = {
            userId,
            type,
            message,
            triggerUserId: triggerUserId || null,
            postId: postId || null,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const notificationRef = await admin.firestore()
            .collection('notifications')
            .add(notificationData);

        res.status(201).json({
            success: true,
            message: 'Notification created successfully',
            notificationId: notificationRef.id
        });

    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create notification'
        });
    }
});

// GET /api/notifications/:uid/stats - Get notification statistics
router.get('/:uid/stats', authenticate, async (req, res) => {
    try {
        const { uid } = req.params;

        // Verify user access
        if (uid !== req.user.uid) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to access these statistics'
            });
        }

        // Get total notifications count
        const totalSnapshot = await admin.firestore()
            .collection('notifications')
            .where('userId', '==', uid)
            .get();

        // Get unread notifications count
        const unreadSnapshot = await admin.firestore()
            .collection('notifications')
            .where('userId', '==', uid)
            .where('read', '==', false)
            .get();

        // Get notifications by type
        const typeCounts = {};
        const notificationTypes = ['like', 'comment', 'follow', 'mention', 'post'];

        for (const type of notificationTypes) {
            const typeSnapshot = await admin.firestore()
                .collection('notifications')
                .where('userId', '==', uid)
                .where('type', '==', type)
                .get();
            
            typeCounts[type] = typeSnapshot.size;
        }

        res.json({
            success: true,
            stats: {
                total: totalSnapshot.size,
                unread: unreadSnapshot.size,
                read: totalSnapshot.size - unreadSnapshot.size,
                byType: typeCounts
            }
        });

    } catch (error) {
        console.error('Get notification stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notification statistics'
        });
    }
});

module.exports = router;
