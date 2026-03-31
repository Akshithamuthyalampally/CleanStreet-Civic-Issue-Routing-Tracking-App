const CleanRegistration = require('../models/CleanRegistration');

// POST /api/clean/register
const registerClean = async (req, res) => {
    try {
        const { areaName, city, preferredDate, volunteersCount } = req.body;
        if (!areaName || !city || !preferredDate || !volunteersCount) {
            return res.status(400).json({ message: 'All fields required' });
        }
        const reg = await CleanRegistration.create({
            userId: req.userId,
            areaName,
            city,
            preferredDate,
            volunteersCount,
        });
        res.status(201).json({ message: 'Registration successful. Thank you!', reg });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { registerClean };
