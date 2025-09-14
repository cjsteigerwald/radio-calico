/**
 * Rating System Module
 * Handles song rating functionality with backend integration
 */
export class RatingSystem {
  constructor(appState, apiService) {
    this.appState = appState;
    this.apiService = apiService;
    this.ratingCooldown = 1000; // 1 second cooldown between ratings
    this.lastRatingTime = 0;

    this.init();
  }

  /**
   * Initialize rating system
   */
  init() {
    this.loadInitialRatings();
  }

  /**
   * Load initial ratings for current song
   */
  async loadInitialRatings() {
    const songId = this.appState.getCurrentSongId();
    const userIdentifier = this.appState.getUserIdentifier();

    try {
      this.appState.set('rating.isLoading', true);

      const response = await this.apiService.getSongRatings(songId, userIdentifier);

      this.appState.setBatch({
        'rating.thumbsUp': response.ratings.thumbs_up,
        'rating.thumbsDown': response.ratings.thumbs_down,
        'rating.userRating': response.userRating,
        'rating.isLoading': false
      });

    } catch (error) {
      console.error('Failed to load initial ratings:', error);
      this.appState.set('rating.isLoading', false);
    }
  }

  /**
   * Submit rating for current song
   * @param {number} rating - Rating value (1 for like, -1 for dislike, 0 for remove)
   */
  async submitRating(rating) {
    // Check cooldown
    const now = Date.now();
    if (now - this.lastRatingTime < this.ratingCooldown) {
      return;
    }

    this.lastRatingTime = now;

    const currentTrack = this.appState.get('currentTrack');
    const songId = this.appState.getCurrentSongId();
    const userIdentifier = this.appState.getUserIdentifier();

    // Optimistic update
    const currentUserRating = this.appState.get('rating.userRating');
    const wasLiked = currentUserRating === 1;
    const wasDisliked = currentUserRating === -1;

    // Calculate new counts optimistically
    let newThumbsUp = this.appState.get('rating.thumbsUp');
    let newThumbsDown = this.appState.get('rating.thumbsDown');

    // Remove previous rating if exists
    if (wasLiked) newThumbsUp--;
    if (wasDisliked) newThumbsDown--;

    // Add new rating
    if (rating === 1) newThumbsUp++;
    if (rating === -1) newThumbsDown++;

    // Update UI optimistically
    this.appState.setBatch({
      'rating.userRating': rating === currentUserRating ? null : rating,
      'rating.thumbsUp': Math.max(0, newThumbsUp),
      'rating.thumbsDown': Math.max(0, newThumbsDown),
      'rating.isLoading': true
    });

    try {
      // Send rating to backend
      const finalRating = rating === currentUserRating ? 0 : rating; // Remove if same rating

      const response = await this.apiService.rateSong(
        songId,
        currentTrack.artist,
        currentTrack.title,
        finalRating,
        userIdentifier
      );

      // Update with server response
      this.appState.setBatch({
        'rating.thumbsUp': response.ratings.thumbs_up,
        'rating.thumbsDown': response.ratings.thumbs_down,
        'rating.userRating': finalRating === 0 ? null : finalRating,
        'rating.isLoading': false
      });

      // Show success feedback
      this.showRatingFeedback(finalRating);

    } catch (error) {
      console.error('Failed to submit rating:', error);

      // Revert optimistic update
      this.loadInitialRatings();

      // Show error feedback
      this.showErrorFeedback('Failed to submit rating. Please try again.');
    }
  }

  /**
   * Handle like button click
   */
  async handleLike() {
    await this.submitRating(1);
  }

  /**
   * Handle dislike button click
   */
  async handleDislike() {
    await this.submitRating(-1);
  }

  /**
   * Show rating feedback to user
   * @param {number} rating - Rating that was submitted
   */
  showRatingFeedback(rating) {
    let message;
    switch (rating) {
      case 1:
        message = '👍 Thanks for the feedback!';
        break;
      case -1:
        message = '👎 Thanks for the feedback!';
        break;
      case 0:
        message = 'Rating removed';
        break;
    }

    this.showTemporaryMessage(message, 2000);
  }

  /**
   * Show error feedback to user
   * @param {string} message - Error message
   */
  showErrorFeedback(message) {
    this.showTemporaryMessage(`❌ ${message}`, 3000);
  }

  /**
   * Show temporary status message
   * @param {string} message - Message to show
   * @param {number} duration - Duration in milliseconds
   */
  showTemporaryMessage(message, duration) {
    const originalStatus = this.appState.get('audioPlayer.status');
    this.appState.set('audioPlayer.status', message);

    setTimeout(() => {
      // Only restore if status hasn't changed
      if (this.appState.get('audioPlayer.status') === message) {
        this.appState.set('audioPlayer.status', originalStatus);
      }
    }, duration);
  }

  /**
   * Update ratings when track changes
   */
  async onTrackChange() {
    // Reset ratings for new track
    this.appState.setBatch({
      'rating.thumbsUp': 0,
      'rating.thumbsDown': 0,
      'rating.userRating': null,
      'rating.isLoading': false
    });

    // Load ratings for new track
    await this.loadInitialRatings();
  }

  /**
   * Get current rating statistics
   * @returns {Object} Rating statistics
   */
  getRatingStats() {
    const thumbsUp = this.appState.get('rating.thumbsUp');
    const thumbsDown = this.appState.get('rating.thumbsDown');
    const total = thumbsUp + thumbsDown;

    return {
      thumbsUp,
      thumbsDown,
      total,
      percentage: total > 0 ? Math.round((thumbsUp / total) * 100) : 0,
      userRating: this.appState.get('rating.userRating')
    };
  }

  /**
   * Export ratings data
   * @returns {Object} Current ratings data
   */
  exportData() {
    return {
      songId: this.appState.getCurrentSongId(),
      track: this.appState.get('currentTrack'),
      ratings: this.getRatingStats(),
      timestamp: new Date().toISOString()
    };
  }
}