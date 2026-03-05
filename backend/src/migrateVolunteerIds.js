const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('./models/User');

async function migrate() {
    try {
        console.log('Connecting to:', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const volunteers = await User.find({ role: 'volunteer', volunteerId: { $exists: false } });
        console.log(`Found ${volunteers.length} volunteers without IDs`);

        for (const volunteer of volunteers) {
            const randomDigits = Math.floor(1000 + Math.random() * 9000);
            volunteer.volunteerId = `VOL-${randomDigits}`;
            await volunteer.save();
            console.log(`Assigned ${volunteer.volunteerId} to ${volunteer.name}`);
        }

        console.log('Migration complete');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
