const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    fullAddress: { type: String, required: true },
    landmark: { type: String },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    urgency: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending' },
    assignedVolunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    images: [{ type: String }], // Array of image URLs/paths
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        complaint_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue' },
        content: String,
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Issue', issueSchema);
