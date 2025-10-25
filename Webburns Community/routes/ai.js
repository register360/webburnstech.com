const express = require('express');
const { authenticate } = require('./middleware/auth');
const axios = require('axios');

const router = express.Router();

// POST /api/ai/suggest - Get AI suggestions for post content
router.post('/suggest', authenticate, async (req, res) => {
    try {
        const { content } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Content is required for AI suggestions'
            });
        }

        // Mock AI suggestions - replace with actual AI service
        const suggestions = generateMockSuggestions(content);

        res.json({
            success: true,
            suggestions,
            message: 'AI suggestions generated successfully'
        });

    } catch (error) {
        console.error('AI suggestion error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate AI suggestions'
        });
    }
});

// POST /api/ai/reply - Get AI-generated reply suggestions
router.post('/reply', authenticate, async (req, res) => {
    try {
        const { postText, context } = req.body;

        if (!postText) {
            return res.status(400).json({
                success: false,
                error: 'Post text is required for reply suggestions'
            });
        }

        // Mock AI reply suggestions
        const replies = generateMockReplies(postText, context);

        res.json({
            success: true,
            replies,
            message: 'AI reply suggestions generated successfully'
        });

    } catch (error) {
        console.error('AI reply error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate reply suggestions'
        });
    }
});

// POST /api/ai/summarize - Summarize post content
router.post('/summarize', authenticate, async (req, res) => {
    try {
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Content is required for summarization'
            });
        }

        // Mock summarization - replace with actual AI service
        const summary = generateMockSummary(content);

        res.json({
            success: true,
            summary,
            message: 'Content summarized successfully'
        });

    } catch (error) {
        console.error('AI summarize error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to summarize content'
        });
    }
});

// Helper functions for mock AI responses
function generateMockSuggestions(content) {
    const baseSuggestions = [
        `Consider adding more details about: "${content.substring(0, 50)}..."`,
        `You might want to include examples related to your topic.`,
        `This could be expanded with some personal experience.`,
        `Great start! Maybe add some context about why this matters.`,
        `Consider breaking this into smaller paragraphs for better readability.`
    ];

    return baseSuggestions.slice(0, 3);
}

function generateMockReplies(postText, context) {
    const replies = [
        "Thanks for sharing this! I found it really insightful.",
        "Interesting perspective! I hadn't thought about it that way.",
        "This is really helpful information, appreciate you posting it!",
        "I've had a similar experience. Could you elaborate more on...",
        "Great post! This reminds me of something related I read recently."
    ];

    return replies.slice(0, 3);
}

function generateMockSummary(content) {
    if (content.length <= 100) return content;
    
    return content.substring(0, 150) + '...';
}

module.exports = router;
