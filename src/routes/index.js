const express = require('express');
const router = express.Router();
const HealthController = require('../controllers/healthController');

// Import route modules
const healthRoutes = require('./health');
const userRoutes = require('./users');
const songRoutes = require('./songs');

// Mount routes
router.use('/health', healthRoutes);
router.get('/test-db', HealthController.checkDatabase); // Legacy endpoint compatibility
router.use('/users', userRoutes);
router.use('/songs', songRoutes);

module.exports = router;