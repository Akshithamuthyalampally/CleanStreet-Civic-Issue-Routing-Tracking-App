const express = require('express');
const router = express.Router();
const { registerClean } = require('../controllers/cleanController');
const verifyToken = require('../middleware/auth');

router.post('/register', verifyToken, registerClean);

module.exports = router;
