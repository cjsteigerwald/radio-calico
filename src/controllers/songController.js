const SongService = require('../services/songService');

class SongController {
  static async rateSong(req, res) {
    const { songId, artist, title, rating, userIdentifier } = req.body;

    try {
      const ratings = await SongService.rateSong(songId, artist, title, userIdentifier, rating);
      res.json({ success: true, ratings });
    } catch (error) {
      if (error.message.includes('required') || error.message.includes('must be')) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  static async getSongRatings(req, res) {
    const { songId } = req.params;
    const { userIdentifier } = req.query;

    try {
      const result = await SongService.getSongRatings(songId, userIdentifier);
      res.json({ success: true, ...result });
    } catch (error) {
      if (error.message.includes('required')) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }
}

module.exports = SongController;