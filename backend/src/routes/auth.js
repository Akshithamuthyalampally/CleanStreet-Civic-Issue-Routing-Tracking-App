const express = require('express');
const router = express.Router();
const { register, login, updateProfile, changePassword, logout } = require('../controllers/authController');
const verifyToken = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', verifyToken, logout);
router.put('/update-profile', verifyToken, updateProfile);
router.put('/change-password', verifyToken, changePassword);

module.exports = router;
