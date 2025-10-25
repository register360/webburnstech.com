const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true
    },
    postsCount: {
        type: Number,
        default: 0
    },
    likesCount: {
        type: Number,
        default: 0
    },
    commentsCount: {
        type: Number,
        default: 0
    },
    followersCount: {
        type: Number,
        default: 0
    },
    followingCount: {
        type: Number,
        default: 0
    },
    loginCount: {
        type: Number,
        default: 0
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    accountCreated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
userStatsSchema.index({ userId: 1 });
userStatsSchema.index({ email: 1 });

module.exports = mongoose.model('UserStats', userStatsSchema);
