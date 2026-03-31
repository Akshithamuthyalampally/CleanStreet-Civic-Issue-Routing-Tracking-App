const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Issue = require('./src/models/Issue');
const User = require('./src/models/User');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const complaints = await Issue.find({})
            .populate('userId', 'name email')
            .populate('assignedVolunteer', 'name volunteerId email')
            .populate('assignedBy', 'name role')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        const mapped = complaints.map(c => ({
            _id: c._id,
            title: c.title,
            userId_populated: !!c.userId?.name,
            citizenName: c.userId?.name || 'Anonymous',
            volunteerName: c.assignedVolunteer?.name || null,
            assignedByRole: c.assignedBy?.role || null
        }));

        console.log(JSON.stringify(mapped, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
