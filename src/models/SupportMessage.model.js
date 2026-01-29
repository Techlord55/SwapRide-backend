const mongoose = require('mongoose');

/**
 * Support Message Model
 * For live chat and contact form messages
 */
const supportMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // Can be null for guest users
  },
  userName: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  userEmail: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
  },
  userPhone: {
    type: String,
    trim: true,
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['live_chat', 'contact_form', 'support_ticket', 'inquiry'],
    default: 'live_chat',
  },
  category: {
    type: String,
    enum: ['general', 'technical', 'billing', 'account', 'vehicle', 'swap', 'other'],
    default: 'general',
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'closed'],
    default: 'pending',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Admin user
    default: null,
  },
  adminResponse: {
    type: String,
    trim: true,
  },
  respondedAt: {
    type: Date,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  attachments: [{
    url: String,
    fileName: String,
    fileType: String,
    fileSize: Number,
  }],
  tags: [{
    type: String,
    trim: true,
  }],
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  notes: [{
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    note: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

// Indexes for better query performance
supportMessageSchema.index({ userId: 1, createdAt: -1 });
supportMessageSchema.index({ userEmail: 1, createdAt: -1 });
supportMessageSchema.index({ status: 1, createdAt: -1 });
supportMessageSchema.index({ type: 1, status: 1 });
supportMessageSchema.index({ assignedTo: 1, status: 1 });
supportMessageSchema.index({ createdAt: -1 });

// Virtual for response time
supportMessageSchema.virtual('responseTime').get(function() {
  if (this.respondedAt && this.createdAt) {
    return Math.floor((this.respondedAt - this.createdAt) / 1000 / 60); // in minutes
  }
  return null;
});

// Instance method to mark as read
supportMessageSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Instance method to assign to admin
supportMessageSchema.methods.assignTo = async function(adminId) {
  this.assignedTo = adminId;
  this.status = 'in_progress';
  return this.save();
};

// Instance method to add admin response
supportMessageSchema.methods.addResponse = async function(response, adminId) {
  this.adminResponse = response;
  this.respondedAt = new Date();
  this.status = 'resolved';
  
  // Add to notes
  this.notes.push({
    adminId,
    note: `Response sent: ${response.substring(0, 100)}...`,
    createdAt: new Date(),
  });
  
  return this.save();
};

// Static method to get pending messages
supportMessageSchema.statics.getPendingMessages = function() {
  return this.find({ status: 'pending' })
    .sort({ priority: -1, createdAt: 1 })
    .populate('userId', 'firstName lastName email')
    .populate('assignedTo', 'firstName lastName email');
};

// Static method to get messages by user
supportMessageSchema.statics.getMessagesByUser = function(userId) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .select('-notes');
};

// Static method to get stats
supportMessageSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      }
    }
  ]);
  
  const total = await this.countDocuments();
  const pending = stats.find(s => s._id === 'pending')?.count || 0;
  const resolved = stats.find(s => s._id === 'resolved')?.count || 0;
  const inProgress = stats.find(s => s._id === 'in_progress')?.count || 0;
  
  return {
    total,
    pending,
    inProgress,
    resolved,
    resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(2) : 0,
  };
};

const SupportMessage = mongoose.model('SupportMessage', supportMessageSchema);

module.exports = SupportMessage;
