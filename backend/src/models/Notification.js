const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: [
            'ISSUE_ACCEPTED',      // Citizen: volunteer accepted their issue
            'ISSUE_REJECTED',      // Citizen: volunteer rejected/dropped their issue
            'STATUS_CHANGED',      // Citizen: issue status changed
            'NEW_ISSUE',           // Volunteer: a new issue was posted
            'ISSUE_ASSIGNED',      // Volunteer: admin assigned an issue to them
            'ADMIN_NEW_ISSUE',     // Admin: new issue created
            'ADMIN_STATUS_UPDATE', // Admin: status update on any issue
        ],
        required: true
    },
    message: { type: String, required: true },
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', default: null },
    isRead: { type: Boolean, default: false },
}, { timestamps: true });

// Index for fast lookup by recipient
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
