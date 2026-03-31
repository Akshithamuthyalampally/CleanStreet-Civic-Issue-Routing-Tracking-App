// Quick test script to verify volunteer analytics endpoint
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const Issue = require('./src/models/Issue');

async function testVolunteerEndpoint() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected successfully');

        // Test query
        const volunteers = await User.find({ role: 'volunteer' }).select('name volunteerId').limit(3);
        console.log(`✅ Found ${volunteers.length} volunteers`);

        if (volunteers.length > 0) {
            console.log('Sample volunteer:', volunteers[0].name);
        }

        const totalVolunteers = await User.countDocuments({ role: 'volunteer' });
        console.log(`✅ Total volunteers in DB: ${totalVolunteers}`);

        const assignedIssues = await Issue.countDocuments({ assignedVolunteer: { $ne: null } });
        console.log(`✅ Total assigned issues: ${assignedIssues}`);

        console.log('\n🎉 Volunteer analytics endpoint should work!');
        console.log('Make sure to restart your backend server with: npm start');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testVolunteerEndpoint();
