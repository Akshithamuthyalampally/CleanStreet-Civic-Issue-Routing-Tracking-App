const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// POST /api/auth/register
const register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });
        if (!passwordRegex.test(password)) return res.status(400).json({ message: 'Password too weak' });

        const exists = await User.findOne({ email });
        if (exists) return res.status(409).json({ message: 'Email already registered' });

        const hashed = await bcrypt.hash(password, 10);
        const role = req.body.role || 'citizen';

        let volunteerId = undefined;
        if (role === 'volunteer') {
            // Generate unique volunteer ID: VOL- followed by 4 random digits
            const randomDigits = Math.floor(1000 + Math.random() * 9000);
            volunteerId = `VOL-${randomDigits}`;

            // Check for collision (rare but possible)
            const idExists = await User.findOne({ volunteerId });
            if (idExists) {
                const newDigits = Math.floor(1000 + Math.random() * 9000);
                volunteerId = `VOL-${newDigits}`;
            }
        }

        const user = await User.create({
            name,
            email,
            password: hashed,
            phone: phone || '',
            role,
            volunteerId
        });
        res.status(201).json({ message: 'Registration successful' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password || !role) return res.status(400).json({ message: 'Email, password, and role selection are required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        // Handle legacy 'user' role by migrating to 'citizen'
        if (user.role === 'user' && role.toLowerCase() === 'citizen') {
            user.role = 'citizen';
            await user.save();
        }

        if (user.role !== role.toLowerCase()) {
            return res.status(401).json({ message: `Access denied. Your account is registered as ${user.role}, not ${role}.` });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                location: user.location,
                role: user.role,
                profilePicture: user.profilePicture,
                volunteerId: user.volunteerId
            },
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /api/auth/update-profile
const updateProfile = async (req, res) => {
    try {
        const { name, email, location, profilePicture } = req.body;
        const user = await User.findByIdAndUpdate(
            req.userId,
            { name, email, location, profilePicture },
            { new: true, runValidators: true, select: '-password' }
        );
        res.json({ message: 'Profile updated', user });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!passwordRegex.test(newPassword)) return res.status(400).json({ message: 'New password too weak' });

        const user = await User.findById(req.userId);
        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) return res.status(401).json({ message: 'Current password is incorrect' });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { register, login, updateProfile, changePassword };
