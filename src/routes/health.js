const express = require('express');
const router = express.Router();
const HealthController = require('../controllers/healthController');

// Health check endpoint
router.get('/', HealthController.checkHealth);

// Test database connection
router.get('/db', HealthController.checkDatabase);

module.exports = router;