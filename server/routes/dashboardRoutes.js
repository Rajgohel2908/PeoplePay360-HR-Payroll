// server/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', getDashboardSummary);

module.exports = router;
