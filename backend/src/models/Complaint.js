const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    type: {
      type: String, enum: ["Waste / Garbage",
        "Road Damage",
        "Water Leakage",
        "Street Light Issue",
        "Pothole",
        "Others"],
      default: 'N/A',
      required: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
      required: true,
    },
    photo: { type: String },
    locationCoords: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [lng, lat]
      },
    },
    address: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // volunteer who accepted
    status: {
      type: String,
      enum: ['received', 'in_review', 'resolved'],
      default: 'received',
      required: true,
    },
  },
  { timestamps: true }
);

ComplaintSchema.index({ locationCoords: '2dsphere' });

module.exports = mongoose.model('Complaint', ComplaintSchema);

