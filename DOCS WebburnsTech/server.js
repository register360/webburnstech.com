const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/webburnstech', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Support Ticket Schema
const supportTicketSchema = new mongoose.Schema({
    ticketId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    company: String,
    plan: String,
    subject: { type: String, required: true },
    category: { type: String, required: true },
    priority: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, default: 'open' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

// Generate unique ticket ID
function generateTicketId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `WBT-${timestamp}-${random}`.toUpperCase();
}

// Email templates
const emailTemplates = {
    confirmation: (ticket) => `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #6c63ff, #00d4aa); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6c63ff; }
                .priority-high { border-left-color: #f44336; }
                .priority-medium { border-left-color: #ff9800; }
                .priority-low { border-left-color: #4caf50; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>WebburnsTech Support</h1>
                    <p>Thank you for contacting us!</p>
                </div>
                <div class="content">
                    <h2>Support Request Received</h2>
                    <p>Hello ${ticket.name},</p>
                    <p>We've received your support request and will get back to you as soon as possible.</p>
                    
                    <div class="ticket-info ${'priority-' + ticket.priority}">
                        <h3>Ticket Details</h3>
                        <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
                        <p><strong>Subject:</strong> ${ticket.subject}</p>
                        <p><strong>Category:</strong> ${ticket.category}</p>
                        <p><strong>Priority:</strong> ${ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}</p>
                        <p><strong>Submitted:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
                    </div>
                    
                    <h3>What happens next?</h3>
                    <ul>
                        <li>Our support team will review your request</li>
                        <li>You'll receive updates via email</li>
                        <li>We'll work to resolve your issue promptly</li>
                    </ul>
                    
                    <p><strong>Expected Response Times:</strong></p>
                    <ul>
                        <li>High Priority: Within 2 hours</li>
                        <li>Medium Priority: Within 8 hours</li>
                        <li>Low Priority: Within 24 hours</li>
                    </ul>
                    
                    <div class="footer">
                        <p>If you need to add additional information to this ticket, please reply to this email.</p>
                        <p>&copy; 2023 WebburnsTech. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `,
    
    internalNotification: (ticket) => `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #6c63ff, #00d4aa); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
                .ticket-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #6c63ff; }
                .priority-high { border-left-color: #f44336; background: #ffebee; }
                .priority-medium { border-left-color: #ff9800; background: #fff3e0; }
                .priority-low { border-left-color: #4caf50; background: #e8f5e8; }
                .description { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>New Support Ticket</h2>
                    <p>Priority: ${ticket.priority.toUpperCase()}</p>
                </div>
                <div class="content">
                    <div class="ticket-info ${'priority-' + ticket.priority}">
                        <h3>Ticket ${ticket.ticketId}</h3>
                        <p><strong>From:</strong> ${ticket.name} (${ticket.email})</p>
                        <p><strong>Company:</strong> ${ticket.company || 'Not specified'}</p>
                        <p><strong>Plan:</strong> ${ticket.plan || 'Not specified'}</p>
                        <p><strong>Category:</strong> ${ticket.category}</p>
                        <p><strong>Subject:</strong> ${ticket.subject}</p>
                        <p><strong>Submitted:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
                    </div>
                    
                    <div class="description">
                        <h4>Description:</h4>
                        <p>${ticket.description}</p>
                    </div>
                    
                    <p><a href="${process.env.SUPPORT_DASHBOARD_URL || 'https://dashboard.webburnstech.dev/support'}">View in Support Dashboard</a></p>
                </div>
            </div>
        </body>
        </html>
    `
};

// API Routes
app.post('/api/support', async (req, res) => {
    try {
        const { name, email, company, plan, subject, category, priority, description } = req.body;
        
        // Validate required fields
        if (!name || !email || !subject || !category || !priority || !description) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be filled out.'
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address.'
            });
        }
        
        // Create ticket
        const ticketId = generateTicketId();
        const ticket = new SupportTicket({
            ticketId,
            name,
            email,
            company,
            plan,
            subject,
            category,
            priority,
            description
        });
        
        await ticket.save();
        
        // Send confirmation email to user
        try {
            await resend.emails.send({
                from: 'WebburnsTech Support <support@webburnstech.dev>',
                to: email,
                subject: `Support Request Received - ${ticketId}`,
                html: emailTemplates.confirmation(ticket)
            });
        } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
            // Don't fail the request if email fails
        }
        
        // Send internal notification
        try {
            await resend.emails.send({
                from: 'WebburnsTech Support <support@webburnstech.dev>',
                to: 'support@webburnstech.dev',
                subject: `New ${priority} Priority Support Ticket - ${ticketId}`,
                html: emailTemplates.internalNotification(ticket)
            });
        } catch (internalEmailError) {
            console.error('Failed to send internal notification:', internalEmailError);
        }
        
        res.json({
            success: true,
            ticketId: ticket.ticketId,
            message: 'Support request submitted successfully.'
        });
        
    } catch (error) {
        console.error('Error creating support ticket:', error);
        
        if (error.code === 11000) {
            // Duplicate ticket ID (very rare)
            return res.status(500).json({
                success: false,
                message: 'There was an issue creating your ticket. Please try again.'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'An internal server error occurred. Please try again later.'
        });
    }
});

// Get ticket status (optional endpoint)
app.get('/api/support/:ticketId', async (req, res) => {
    try {
        const ticket = await SupportTicket.findOne({ ticketId: req.params.ticketId });
        
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found.'
            });
        }
        
        res.json({
            success: true,
            ticket: {
                ticketId: ticket.ticketId,
                subject: ticket.subject,
                status: ticket.status,
                priority: ticket.priority,
                createdAt: ticket.createdAt,
                updatedAt: ticket.updatedAt
            }
        });
        
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching ticket information.'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'WebburnsTech Support API'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        message: 'An unexpected error occurred.'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found.'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Support API available at http://localhost:${PORT}/api/support`);
});

module.exports = app;
