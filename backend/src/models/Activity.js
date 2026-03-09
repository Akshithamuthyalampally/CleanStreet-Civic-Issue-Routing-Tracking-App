const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true }, // e.g., 'STATUS_UPDATE', 'ASSIGNMENT', 'USER_MANAGEMENT'
    details: { type: String, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId }, // e.g., the ID of the issue or user being acted upon
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Activity', activitySchema);
