const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    required: true 
  },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['new', 'in-progress', 'resolved', 'closed'], 
    default: 'new' 
  },
  adminNotes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

contactSchema.index({ email: 1, createdAt: -1 });
contactSchema.index({ priority: 1, status: 1 });
contactSchema.index({ status: 1 });

module.exports = mongoose.model('Contact', contactSchema);