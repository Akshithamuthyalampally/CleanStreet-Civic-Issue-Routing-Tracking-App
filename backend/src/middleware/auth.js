const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token Verified:', { userId: decoded.userId, role: decoded.role });
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        next();
    } catch (err) {
        console.error('Token Verification Failed:', err.message);
        res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = verifyToken;
