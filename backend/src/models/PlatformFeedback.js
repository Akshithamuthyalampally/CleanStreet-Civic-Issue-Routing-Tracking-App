const mongoose = require("mongoose");

const platformFeedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userRole: {
      type: String,
      enum: ["user", "volunteer"],
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    queries: { type: String, default: "" },
    suggestions: { type: String, default: "" },
    issues: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlatformFeedback", platformFeedbackSchema);
