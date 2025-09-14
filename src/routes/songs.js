const express = require('express');
const router = express.Router();
const SongController = require('../controllers/songController');

// Rate a song
router.post('/rate', SongController.rateSong);

// Get song ratings
router.get('/:songId/ratings', SongController.getSongRatings);

module.exports = router;