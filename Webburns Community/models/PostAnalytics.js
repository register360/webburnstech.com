const mongoose = require('mongoose');

const postAnalyticsSchema = new mongoose.Schema({
    postId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true
    },
    contentLength: {
        type: Number,
        required: true
    },
    hasImage: {
        type: Boolean,
        default: false
    },
    visibility: {
        type: String,
        enum: ['public', 'followers', 'private'],
        default: 'public'
    },
    likesCount: {
        type: Number,
        default: 0
    },
    commentsCount: {
        type: Number,
        default: 0
    },
    sharesCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
postAnalyticsSchema.index({ postId: 1 });
postAnalyticsSchema.index({ userId: 1 });
postAnalyticsSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PostAnalytics', postAnalyticsSchema);
