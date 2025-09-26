/**
 * iTunes API Service for Album Artwork and Metadata
 * Handles searching and fetching album artwork from iTunes API
 */
class ITunesService {
  constructor() {
    this.baseUrl = 'https://itunes.apple.com/search';
    this.cache = new Map();
    this.cacheTimeout = 1000 * 60 * 60; // 1 hour
  }

  /**
   * Search iTunes API for album artwork
   * @param {string} artist - Artist name
   * @param {string} title - Song title
   * @param {string} album - Album name (optional)
   * @returns {Promise<Object>} Search results
   */
  async searchAlbumArtwork(artist, title, album = null) {
    const cacheKey = `${artist}-${title}${album ? '-' + album : ''}`.toLowerCase();

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // Construct search query
      let searchTerm = `${artist} ${title}`;
      if (album) {
        searchTerm += ` ${album}`;
      }

      const url = new URL(this.baseUrl);
      url.searchParams.append('term', searchTerm);
      url.searchParams.append('media', 'music');
      url.searchParams.append('entity', 'song');
      url.searchParams.append('limit', '5');

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`iTunes API error: ${response.status}`);
      }

      // Process results
      const processedResults = this.processSearchResults(data.results, artist, title);

      // Cache the results
      this.cache.set(cacheKey, {
        data: processedResults,
        timestamp: Date.now()
      });

      return processedResults;

    } catch (error) {
      console.error('iTunes API search failed:', error);
      return {
        artwork: null,
        match: false,
        error: error.message
      };
    }
  }

  /**
   * Process iTunes search results to find best match
   * @param {Array} results - iTunes search results
   * @param {string} originalArtist - Original artist name
   * @param {string} originalTitle - Original title
   * @returns {Object} Processed result
   */
  processSearchResults(results, originalArtist, originalTitle) {
    if (!results || results.length === 0) {
      return {
        artwork: null,
        match: false,
        error: 'No results found'
      };
    }

    // Score each result based on similarity
    const scoredResults = results.map(result => {
      const artistScore = this.calculateSimilarity(
        originalArtist.toLowerCase(),
        result.artistName.toLowerCase()
      );

      const titleScore = this.calculateSimilarity(
        originalTitle.toLowerCase(),
        result.trackName.toLowerCase()
      );

      return {
        ...result,
        score: (artistScore + titleScore) / 2,
        artistScore,
        titleScore
      };
    });

    // Sort by score and take the best match
    scoredResults.sort((a, b) => b.score - a.score);
    const bestMatch = scoredResults[0];

    // Only accept matches with reasonable similarity
    const isGoodMatch = bestMatch.score > 0.6;

    return {
      artwork: isGoodMatch ? this.getHighResArtwork(bestMatch.artworkUrl100) : null,
      match: isGoodMatch,
      confidence: bestMatch.score,
      matchedArtist: bestMatch.artistName,
      matchedTitle: bestMatch.trackName,
      album: bestMatch.collectionName,
      releaseDate: bestMatch.releaseDate,
      originalArtwork: bestMatch.artworkUrl100,
      allResults: scoredResults
    };
  }

  /**
   * Calculate similarity between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    // Simple similarity calculation based on common words
    const words1 = str1.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
    const words2 = str2.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);

    if (words1.length === 0 || words2.length === 0) {
      return 0;
    }

    const commonWords = words1.filter(word =>
      words2.some(w => w === word || w.includes(word) || word.includes(w))
    );

    return commonWords.length / Math.max(words1.length, words2.length);
  }

  /**
   * Convert artwork URL to higher resolution
   * @param {string} artworkUrl - Original artwork URL
   * @returns {string} High resolution artwork URL
   */
  getHighResArtwork(artworkUrl) {
    if (!artworkUrl) return null;

    // Replace 100x100 with 600x600 for higher resolution
    return artworkUrl.replace('100x100bb', '600x600bb');
  }

  /**
   * Preload artwork image
   * @param {string} artworkUrl - Artwork URL
   * @returns {Promise<HTMLImageElement>} Loaded image element
   */
  async preloadArtwork(artworkUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load artwork'));

      img.src = artworkUrl;
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create and export singleton instance
const itunesServiceInstance = new ITunesService();
export { itunesServiceInstance as iTunesService };