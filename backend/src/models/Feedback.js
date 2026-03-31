const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rating: {
      type: Number,
      required: true,
    },
    serviceQuality: String,
    responseTime: String,
    professionalism: String,
    comment: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", feedbackSchema);