const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const Issue = require('./src/models/Issue');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.countDocuments();
        const issues = await Issue.countDocuments();
        const citizens = await User.countDocuments({ role: 'citizen' });
        const volunteers = await User.countDocuments({ role: 'volunteer' });

        console.log('--- DATABASE STATUS ---');
        console.log('Total Users:', users);
        console.log('Citizens:', citizens);
        console.log('Volunteers:', volunteers);
        console.log('Total Complaints:', issues);

        if (issues > 0) {
            const sample = await Issue.findOne();
            console.log('Sample Issue Status:', sample.status);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
check();
