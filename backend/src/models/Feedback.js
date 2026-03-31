const mongoose = require('mongoose');

const feedbackMessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true },
    isDeleted: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
}, { timestamps: true });

const feedbackSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', default: null },
    messages: { type: [feedbackMessageSchema], default: [] },
    // Innehåller userIds som har olästa nya meddelanden i tråden
    unreadFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
}, { timestamps: true });

feedbackSchema.index({ recipients: 1, updatedAt: -1 });
feedbackSchema.index({ sender: 1, updatedAt: -1 });
feedbackSchema.index({ unreadFor: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);

