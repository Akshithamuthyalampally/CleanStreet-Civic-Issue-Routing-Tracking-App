require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./src/routes/auth');
const issueRoutes = require('./src/routes/issues');
const cleanRoutes = require('./src/routes/clean');

const adminRoutes = require('./src/routes/admin');
const notificationRoutes = require('./src/routes/notifications');
const path = require('path');
const fs = require('fs');

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/clean', cleanRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/version', (req, res) => res.json({ version: '1.2.0', status: 'Admin routes registered' }));

app.get('/', (req, res) => res.json({ message: 'Civic App API running' }));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('SERVER_ERROR:', err);

    if (err.message && err.message.includes('Must supply api_key')) {
        return res.status(500).json({
            message: 'Image transmission infrastructure not configured. Please supply valid Cloudinary credentials in .env.'
        });
    }

    if (err.name === 'MulterError') {
        return res.status(400).json({ message: `Upload error: ${err.message}` });
    }

    res.status(500).json({ message: err.message || 'Internal transmission failure' });
});

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');
        app.listen(process.env.PORT || 5000, () =>
            console.log(`Server running on port ${process.env.PORT || 5000}`)
        );
    })
    .catch((err) => console.error('MongoDB connection error:', err));
