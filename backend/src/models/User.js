const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // store hashed password
    location: { type: String },
    role: {
      type: String,
      enum: ['user', 'volunteer', 'admin'],
      default: 'user',
      required: true,
    },
    profilePhoto: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);

