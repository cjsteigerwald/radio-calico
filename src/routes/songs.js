const express = require('express');
const router = express.Router();
const SongController = require('../controllers/songController');
const { rateLimiter } = require('../middleware/security');

// Rate a song (with stricter rate limiting)
router.post('/rate', rateLimiter, SongController.rateSong);

// Get song ratings
router.get('/:songId/ratings', SongController.getSongRatings);

module.exports = router;