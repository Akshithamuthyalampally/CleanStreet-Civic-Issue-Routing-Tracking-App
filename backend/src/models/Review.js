const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    citizenName: { type: String, required: true },
    citizenId: { type: String, required: true },
    complaintType: { type: String, required: true },
    overallRating: { type: Number, required: true, min: 1, max: 5 },
    serviceQuality: { type: String, required: true },
    responseTime: { type: String, required: true },
    volunteerProfessionalism: { type: String, required: true },
    comments: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    
    // Phase 4: Volunteer Specific Feedback
    type: { type: String, enum: ['general', 'issue_based'], default: 'general' },
    volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', default: null },
    
    // Expanded tracking
    isReadByAdmin: { type: Boolean, default: false },
    isReadByVolunteer: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
