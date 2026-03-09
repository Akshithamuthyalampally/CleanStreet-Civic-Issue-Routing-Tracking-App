const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        const users = await User.find({}, 'email role name');
        console.log('--- USERS IN DB ---');
        users.forEach(u => console.log(`${u.email} - Role: ${u.role} - Name: ${u.name}`));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
check();
