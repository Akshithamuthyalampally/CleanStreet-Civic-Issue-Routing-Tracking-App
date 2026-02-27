const mongoose = require('mongoose');

const cleanRegistrationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    areaName: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    preferredDate: { type: Date, required: true },
    volunteersCount: { type: Number, required: true, min: 1 },
}, { timestamps: true });

module.exports = mongoose.model('CleanRegistration', cleanRegistrationSchema);
