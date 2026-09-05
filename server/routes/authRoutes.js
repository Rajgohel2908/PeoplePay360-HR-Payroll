// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const {
  login,
  getProfile,
  getDemoCredentials,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  changePassword
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/login', login);
router.get('/demo-accounts', getDemoCredentials);
router.get('/profile', authenticateToken, getProfile);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-token', verifyResetToken);
router.post('/reset-password', resetPassword);
router.put('/change-password', authenticateToken, changePassword);

module.exports = router;
