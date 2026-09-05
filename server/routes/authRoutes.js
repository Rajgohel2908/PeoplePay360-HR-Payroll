// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { login, getProfile, getDemoCredentials } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/login', login);
router.get('/demo-accounts', getDemoCredentials);
router.get('/profile', authenticateToken, getProfile);

module.exports = router;
