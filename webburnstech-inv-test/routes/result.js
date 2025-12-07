// result.js - Route handler for results
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('./models/User');
const Attempt = require('./models/Attempt');

// GET /api/results - Get all candidates' results
router.get('/', async (req, res) => {
    try {
        // Get all attempts with user data
        const attempts = await Attempt.find()
            .populate('userId')
            .sort({ startAt: -1 });

        // Transform data for frontend
        const results = attempts.map(attempt => {
            const user = attempt.userId;
            
            // Calculate percentage
            const totalMarks = 75 * 3; // 75 questions × 3 marks each
            const percentage = attempt.score ? (attempt.score / totalMarks * 100).toFixed(1) : 0;
            
            // Format dates
            const formatDate = (date) => {
                if (!date) return 'N/A';
                return new Date(date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
            };

            const formatDateTime = (date) => {
                if (!date) return 'N/A';
                return new Date(date).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            };

            // Format duration
            const formatDuration = (seconds) => {
                if (!seconds) return 'N/A';
                const hrs = Math.floor(seconds / 3600);
                const mins = Math.floor((seconds % 3600) / 60);
                const secs = seconds % 60;
                return `${hrs > 0 ? hrs + 'h ' : ''}${mins}m ${secs}s`;
            };

            // Determine status color
            const getStatusColor = (status) => {
                switch(status) {
                    case 'accepted': return 'bg-green-100 text-green-800';
                    case 'verified': return 'bg-blue-100 text-blue-800';
                    case 'pending': return 'bg-yellow-100 text-yellow-800';
                    case 'rejected': return 'bg-red-100 text-red-800';
                    default: return 'bg-gray-100 text-gray-800';
                }
            };

            // Format cheating events
            const cheatingEvents = attempt.cheatingEvents || [];
            const cheatingDetails = cheatingEvents.map(event => {
                const eventTypes = {
                    'tabChange': 'Tab Switching Detected',
                    'copy': 'Copy Action Detected',
                    'paste': 'Paste Action Detected',
                    'unauthorizedFocus': 'Unauthorized Window Focus',
                    'multipleTabs': 'Multiple Tabs Detected',
                    'devTools': 'Developer Tools Opened'
                };
                return {
                    type: eventTypes[event.type] || event.type,
                    time: new Date(event.time).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    }),
                    warningCount: event.warningCount || 1
                };
            });

            return {
                id: attempt._id.toString(),
                userId: user._id.toString(),
                candidateName: `${user.firstName} ${user.lastName}`,
                candidateEmail: user.email,
                candidateGender: user.gender?.charAt(0).toUpperCase() + user.gender?.slice(1) || 'N/A',
                candidateCity: user.city || 'N/A',
                candidateState: user.state || 'N/A',
                status: user.status || 'pending',
                statusColor: getStatusColor(user.status),
                registeredAt: formatDate(user.registeredAt),
                verifiedAt: formatDate(user.verifiedAt),
                acceptedAt: formatDate(user.acceptedAt),
                rejectedAt: formatDate(user.rejectedAt),
                examDate: attempt.examDate || '2025-11-30',
                examStart: formatDateTime(attempt.startAt),
                examEnd: formatDateTime(attempt.endAt),
                duration: formatDuration(attempt.durationSec),
                score: attempt.score || 0,
                percentage: percentage,
                totalMarks: totalMarks,
                cheatingEvents: cheatingEvents,
                cheatingDetails: cheatingDetails,
                cheatingCount: cheatingEvents.length,
                submittedAt: formatDateTime(attempt.submittedAt),
                autoSubmitted: attempt.autoSubmitted || false,
                answersCount: attempt.answers?.length || 0
            };
        });

        // Calculate statistics
        const totalCandidates = results.length;
        const avgScore = results.length > 0 
            ? (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1)
            : 0;
        const cheatingCount = results.reduce((sum, r) => sum + r.cheatingCount, 0);
        const completionRate = results.length > 0
            ? ((results.filter(r => r.submittedAt !== 'N/A').length / results.length) * 100).toFixed(1)
            : 0;

        res.json({
            success: true,
            results: results,
            statistics: {
                totalCandidates,
                avgScore,
                cheatingCount,
                completionRate,
                highScorers: results.filter(r => r.percentage >= 70).length,
                mediumScorers: results.filter(r => r.percentage >= 40 && r.percentage < 70).length,
                lowScorers: results.filter(r => r.percentage < 40).length
            }
        });

    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch results'
        });
    }
});

// GET /api/results/:userId - Get specific candidate's result
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const attempt = await Attempt.findOne({ userId })
            .populate('userId')
            .sort({ startAt: -1 });

        if (!attempt) {
            return res.status(404).json({
                success: false,
                error: 'Result not found'
            });
        }

        // Transform data (similar to above)
        const user = attempt.userId;
        const totalMarks = 75 * 3;
        const percentage = attempt.score ? (attempt.score / totalMarks * 100).toFixed(1) : 0;

        const formatDate = (date) => {
            if (!date) return 'N/A';
            return new Date(date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        };

        const formatDateTime = (date) => {
            if (!date) return 'N/A';
            return new Date(date).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        };

        const result = {
            candidateName: `${user.firstName} ${user.lastName}`,
            candidateEmail: user.email,
            candidateGender: user.gender?.charAt(0).toUpperCase() + user.gender?.slice(1) || 'N/A',
            candidateCity: user.city || 'N/A',
            status: user.status || 'pending',
            registeredAt: formatDate(user.registeredAt),
            verifiedAt: formatDate(user.verifiedAt),
            acceptedAt: formatDate(user.acceptedAt),
            examDate: attempt.examDate || '2025-11-30',
            examStart: formatDateTime(attempt.startAt),
            examEnd: formatDateTime(attempt.endAt),
            duration: attempt.durationSec ? 
                `${Math.floor(attempt.durationSec / 3600)}h ${Math.floor((attempt.durationSec % 3600) / 60)}m ${attempt.durationSec % 60}s` 
                : 'N/A',
            score: attempt.score || 0,
            percentage: percentage,
            totalMarks: totalMarks,
            cheatingEvents: attempt.cheatingEvents || [],
            submittedAt: formatDateTime(attempt.submittedAt),
            answersCount: attempt.answers?.length || 0,
            fatherName: user.fatherName || '',
            motherName: user.motherName || '',
            dob: formatDate(user.dob),
            phone: user.phone || '',
            state: user.state || ''
        };

        res.json({
            success: true,
            result: result
        });

    } catch (error) {
        console.error('Error fetching result:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch result'
        });
    }
});

module.exports = router;
