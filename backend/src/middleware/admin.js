const adminOnly = (req, res, next) => {
    console.log('Checking Admin Access for role:', req.userRole);
    if (req.userRole !== 'admin') {
        console.log('Access Denied: User is not an admin');
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
};

module.exports = adminOnly;
