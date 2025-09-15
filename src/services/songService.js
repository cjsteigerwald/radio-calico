const Database = require('../database');

class SongService {
  static validateRatingInput(songId, artist, title, userIdentifier, rating) {
    const errors = [];

    if (!songId || songId.trim().length === 0) {
      errors.push('Song ID is required');
    }

    if (!artist || artist.trim().length === 0) {
      errors.push('Artist is required');
    }

    if (!title || title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!userIdentifier || userIdentifier.trim().length === 0) {
      errors.push('User identifier is required');
    }

    if (rating !== 1 && rating !== -1 && rating !== 0) {
      errors.push('Rating must be 1 (like), -1 (dislike), or 0 (remove)');
    }

    return errors;
  }

  static async rateSong(songId, artist, title, userIdentifier, rating) {
    const validationErrors = this.validateRatingInput(songId, artist, title, userIdentifier, rating);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(', '));
    }

    try {
      // Use unified database interface that handles both SQLite and PostgreSQL
      const result = await Database.rateSong(
        songId.trim(),
        userIdentifier.trim(),
        artist.trim(),
        title.trim(),
        rating
      );

      // Get updated ratings
      const updatedRatings = await Database.getSongRatings(songId.trim());
      return updatedRatings;
    } catch (error) {
      throw error;
    }
  }

  static async getSongRatings(songId, userIdentifier = null) {
    if (!songId || songId.trim().length === 0) {
      throw new Error('Song ID is required');
    }

    const ratings = await Database.getSongRatings(songId.trim());
    let userRating = null;

    if (userIdentifier && userIdentifier.trim().length > 0) {
      const userRatingData = await Database.getUserSongRating(songId.trim(), userIdentifier.trim());
      userRating = userRatingData ? userRatingData.rating : null;
    }

    return {
      likes: ratings.likes || 0,
      dislikes: ratings.dislikes || 0,
      userRating
    };
  }
}

module.exports = SongService;