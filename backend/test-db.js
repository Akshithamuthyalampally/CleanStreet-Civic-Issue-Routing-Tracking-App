const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
    try {
        console.log('URI:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}
test();
