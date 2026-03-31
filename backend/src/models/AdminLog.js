const mongoose = require('mongoose');

const AdminLogSchema = new mongoose.Schema({
  activityType: {
    type: String,
    enum: [
      'complaint_created',
      'status_changed',
      'volunteer_assigned',
      'volunteer_accepted',
      'volunteer_rejected',
      'complaint_resolved',
      'complaint_deleted',
      'complaint_edited',
      'role_changed',
      'user_deleted',
    ],
    required: true,
  },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  targetName: { type: String }, // complaint title or user name
  details: { type: String },    // e.g. "Pending → In Review"
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AdminLog', AdminLogSchema);
