const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
    voteType: { type: String, enum: ['upvote', 'downvote'], required: true },
  },
  { timestamps: true }
);

// One vote per user per complaint
VoteSchema.index({ user: 1, complaint: 1 }, { unique: true });

module.exports = mongoose.model('Vote', VoteSchema);

