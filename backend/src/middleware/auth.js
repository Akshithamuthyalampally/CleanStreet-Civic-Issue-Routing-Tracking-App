const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    return next();
  } catch (error) {
    console.error('Token Verification Failed:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const isVolunteer = (req, res, next) => {
  console.log(`[isVolunteer] user: ${req.user?.email} | role: ${req.user?.role}`);
  if (req.user?.role !== 'volunteer') {
    console.warn(`[isVolunteer] DENIED — role "${req.user?.role}" is not volunteer`);
    return res.status(403).json({ success: false, message: 'Access restricted to volunteers only' });
  }
  console.log(`[isVolunteer] GRANTED for ${req.user.email}`);
  return next();
};

module.exports = auth;
module.exports.isVolunteer = isVolunteer;
