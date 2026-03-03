const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({
    email: String,
    role: String
});

const User = mongoose.model('User', userSchema);

async function updateRole(email, role) {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOneAndUpdate({ email }, { role }, { new: true });
        if (user) {
            console.log(`Updated user ${email} to role ${role}`);
        } else {
            console.log(`User ${email} not found`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

const email = process.argv[2];
const role = process.argv[3];

if (!email || !role) {
    console.log('Usage: node updateRole.js <email> <role>');
    process.exit(1);
}

updateRole(email, role);
