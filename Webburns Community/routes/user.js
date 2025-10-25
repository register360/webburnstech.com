const express = require('express');
const admin = require('firebase-admin');
const { authenticate } = require('./middleware/auth');
const { validateProfileUpdate } = require('./middleware/validation');

const router = express.Router();

// GET /api/user/:uid - Get user profile
router.get('/:uid', authenticate, async (req, res) => {
    try {
        const { uid } = req.params;

        const userDoc = await admin.firestore()
            .collection('users')
            .doc(uid)
            .get();

        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const userData = userDoc.data();

        // Don't return sensitive information
        const publicProfile = {
            uid: userDoc.id,
            name: userData.name,
            username: userData.username,
            avatarURL: userData.avatarURL,
            bio: userData.bio,
            location: userData.location,
            website: userData.website,
            followersCount: userData.followers?.length || 0,
            followingCount: userData.following?.length || 0,
            postsCount: userData.postsCount || 0,
            createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
            isFollowing: userData.followers?.includes(req.user.uid) || false
        };

        res.json({
            success: true,
            user: publicProfile
        });

    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user profile'
        });
    }
});

// PUT /api/user/:uid/update - Update user profile
router.put('/:uid/update', authenticate, validateProfileUpdate, async (req, res) => {
    try {
        const { uid } = req.params;
        const updateData = req.body;

        // Check if user is updating their own profile
        if (uid !== req.user.uid) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to update this profile'
            });
        }

        // Remove fields that shouldn't be updated
        delete updateData.uid;
        delete updateData.email;
        delete updateData.createdAt;
        delete updateData.followers;
        delete updateData.following;
        delete updateData.postsCount;

        // Add updated timestamp
        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        // Update user in Firestore
        await admin.firestore()
            .collection('users')
            .doc(uid)
            .update(updateData);

        // Get updated user data
        const updatedUserDoc = await admin.firestore()
            .collection('users')
            .doc(uid)
            .get();

        const updatedUser = updatedUserDoc.data();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                uid,
                name: updatedUser.name,
                username: updatedUser.username,
                avatarURL: updatedUser.avatarURL,
                bio: updatedUser.bio,
                location: updatedUser.location,
                website: updatedUser.website
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
});

// GET /api/user/:uid/posts - Get user's posts
router.get('/:uid/posts', authenticate, async (req, res) => {
    try {
        const { uid } = req.params;
        const { limit = 20, lastVisible } = req.query;

        let query = admin.firestore()
            .collection('posts')
            .where('userId', '==', uid)
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

        // Get user data
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(uid)
            .get();

        const userData = userDoc.exists ? userDoc.data() : {};

        for (const doc of snapshot.docs) {
            const postData = doc.data();
            
            posts.push({
                id: doc.id,
                ...postData,
                user: {
                    uid: uid,
                    name: userData.name || 'Unknown User',
                    username: userData.username,
                    avatarURL: userData.avatarURL
                },
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
        console.error('Get user posts error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user posts'
        });
    }
});

// POST /api/user/:uid/follow - Follow a user
router.post('/:uid/follow', authenticate, async (req, res) => {
    try {
        const { uid } = req.params; // User to follow
        const followerId = req.user.uid; // Current user

        if (uid === followerId) {
            return res.status(400).json({
                success: false,
                error: 'Cannot follow yourself'
            });
        }

        // Check if user exists
        const userToFollowDoc = await admin.firestore()
            .collection('users')
            .doc(uid)
            .get();

        if (!userToFollowDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const userToFollow = userToFollowDoc.data();
        const currentUserDoc = await admin.firestore()
            .collection('users')
            .doc(followerId)
            .get();

        const currentUser = currentUserDoc.data();

        // Check if already following
        const isFollowing = userToFollow.followers?.includes(followerId) || false;

        if (isFollowing) {
            return res.status(400).json({
                success: false,
                error: 'Already following this user'
            });
        }

        // Update both users' follower/following arrays
        const batch = admin.firestore().batch();

        // Add to target user's followers
        const targetUserFollowers = [...(userToFollow.followers || []), followerId];
        batch.update(admin.firestore().collection('users').doc(uid), {
            followers: targetUserFollowers,
            followersCount: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Add to current user's following
        const currentUserFollowing = [...(currentUser.following || []), uid];
        batch.update(admin.firestore().collection('users').doc(followerId), {
            following: currentUserFollowing,
            followingCount: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        // Create notification
        await createNotification({
            userId: uid,
            type: 'follow',
            message: `${currentUser.name} started following you`,
            triggerUserId: followerId,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({
            success: true,
            message: 'Successfully followed user',
            following: true,
            followersCount: targetUserFollowers.length
        });

    } catch (error) {
        console.error('Follow user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to follow user'
        });
    }
});

// POST /api/user/:uid/unfollow - Unfollow a user
router.post('/:uid/unfollow', authenticate, async (req, res) => {
    try {
        const { uid } = req.params; // User to unfollow
        const followerId = req.user.uid; // Current user

        // Check if user exists
        const userToUnfollowDoc = await admin.firestore()
            .collection('users')
            .doc(uid)
            .get();

        if (!userToUnfollowDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const userToUnfollow = userToUnfollowDoc.data();
        const currentUserDoc = await admin.firestore()
            .collection('users')
            .doc(followerId)
            .get();

        const currentUser = currentUserDoc.data();

        // Check if actually following
        const isFollowing = userToUnfollow.followers?.includes(followerId) || false;

        if (!isFollowing) {
            return res.status(400).json({
                success: false,
                error: 'Not following this user'
            });
        }

        // Update both users' follower/following arrays
        const batch = admin.firestore().batch();

        // Remove from target user's followers
        const targetUserFollowers = userToUnfollow.followers?.filter(id => id !== followerId) || [];
        batch.update(admin.firestore().collection('users').doc(uid), {
            followers: targetUserFollowers,
            followersCount: admin.firestore.FieldValue.increment(-1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Remove from current user's following
        const currentUserFollowing = currentUser.following?.filter(id => id !== uid) || [];
        batch.update(admin.firestore().collection('users').doc(followerId), {
            following: currentUserFollowing,
            followingCount: admin.firestore.FieldValue.increment(-1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        res.json({
            success: true,
            message: 'Successfully unfollowed user',
            following: false,
            followersCount: targetUserFollowers.length
        });

    } catch (error) {
        console.error('Unfollow user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unfollow user'
        });
    }
});

// GET /api/user/:uid/followers - Get user's followers
router.get('/:uid/followers', authenticate, async (req, res) => {
    try {
        const { uid } = req.params;
        const { limit = 50 } = req.query;

        const userDoc = await admin.firestore()
            .collection('users')
            .doc(uid)
            .get();

        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const userData = userDoc.data();
        const followerIds = userData.followers || [];

        // Get limited number of followers
        const limitedFollowerIds = followerIds.slice(0, parseInt(limit));

        const followers = [];
        for (const followerId of limitedFollowerIds) {
            const followerDoc = await admin.firestore()
                .collection('users')
                .doc(followerId)
                .get();

            if (followerDoc.exists) {
                const followerData = followerDoc.data();
                followers.push({
                    uid: followerId,
                    name: followerData.name,
                    username: followerData.username,
                    avatarURL: followerData.avatarURL,
                    bio: followerData.bio
                });
            }
        }

        res.json({
            success: true,
            followers,
            totalCount: followerIds.length
        });

    } catch (error) {
        console.error('Get followers error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch followers'
        });
    }
});

// GET /api/user/:uid/following - Get users followed by
router.get('/:uid/following', authenticate, async (req, res) => {
    try {
        const { uid } = req.params;
        const { limit = 50 } = req.query;

        const userDoc = await admin.firestore()
            .collection('users')
            .doc(uid)
            .get();

        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const userData = userDoc.data();
        const followingIds = userData.following || [];

        // Get limited number of following
        const limitedFollowingIds = followingIds.slice(0, parseInt(limit));

        const following = [];
        for (const followingId of limitedFollowingIds) {
            const followingDoc = await admin.firestore()
                .collection('users')
                .doc(followingId)
                .get();

            if (followingDoc.exists) {
                const followingData = followingDoc.data();
                following.push({
                    uid: followingId,
                    name: followingData.name,
                    username: followingData.username,
                    avatarURL: followingData.avatarURL,
                    bio: followingData.bio
                });
            }
        }

        res.json({
            success: true,
            following,
            totalCount: followingIds.length
        });

    } catch (error) {
        console.error('Get following error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch following'
        });
    }
});

// GET /api/user/search/:query - Search users
router.get('/search/:query', authenticate, async (req, res) => {
    try {
        const { query } = req.params;
        const { limit = 10 } = req.query;

        if (!query || query.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Search query must be at least 2 characters'
            });
        }

        const usersRef = admin.firestore().collection('users');
        
        // Search by username
        const usernameSnapshot = await usersRef
            .where('username', '>=', query.toLowerCase())
            .where('username', '<=', query.toLowerCase() + '\uf8ff')
            .limit(parseInt(limit))
            .get();

        // Search by name
        const nameSnapshot = await usersRef
            .where('name', '>=', query)
            .where('name', '<=', query + '\uf8ff')
            .limit(parseInt(limit))
            .get();

        const usersMap = new Map();

        // Process username results
        usernameSnapshot.forEach(doc => {
            const userData = doc.data();
            usersMap.set(doc.id, {
                uid: doc.id,
                name: userData.name,
                username: userData.username,
                avatarURL: userData.avatarURL,
                bio: userData.bio,
                followersCount: userData.followers?.length || 0
            });
        });

        // Process name results
        nameSnapshot.forEach(doc => {
            const userData = doc.data();
            if (!usersMap.has(doc.id)) {
                usersMap.set(doc.id, {
                    uid: doc.id,
                    name: userData.name,
                    username: userData.username,
                    avatarURL: userData.avatarURL,
                    bio: userData.bio,
                    followersCount: userData.followers?.length || 0
                });
            }
        });

        const users = Array.from(usersMap.values());

        res.json({
            success: true,
            users,
            count: users.length
        });

    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search users'
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
