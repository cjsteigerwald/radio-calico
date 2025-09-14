/**
 * API Service for RadioCalico Backend Communication
 * Handles all API calls to the backend services
 */
export class ApiService {
  constructor() {
    this.baseUrl = '/api';
  }

  /**
   * Make HTTP request with error handling
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Response data
   */
  async request(url, options = {}) {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(`${this.baseUrl}${url}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * GET request
   * @param {string} url - Request URL
   * @returns {Promise<Object>} Response data
   */
  async get(url) {
    return this.request(url, { method: 'GET' });
  }

  /**
   * POST request
   * @param {string} url - Request URL
   * @param {Object} data - Request body data
   * @returns {Promise<Object>} Response data
   */
  async post(url, data) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Health check
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    return this.get('/health');
  }

  /**
   * Database health check
   * @returns {Promise<Object>} Database health status
   */
  async checkDatabaseHealth() {
    return this.get('/health/db');
  }

  /**
   * Submit song rating
   * @param {string} songId - Song identifier
   * @param {string} artist - Artist name
   * @param {string} title - Song title
   * @param {number} rating - Rating (1, -1, or 0)
   * @param {string} userIdentifier - User identifier
   * @returns {Promise<Object>} Rating results
   */
  async rateSong(songId, artist, title, rating, userIdentifier) {
    return this.post('/songs/rate', {
      songId,
      artist,
      title,
      rating,
      userIdentifier
    });
  }

  /**
   * Get song ratings
   * @param {string} songId - Song identifier
   * @param {string} userIdentifier - User identifier (optional)
   * @returns {Promise<Object>} Song ratings
   */
  async getSongRatings(songId, userIdentifier = null) {
    const url = `/songs/${songId}/ratings` +
      (userIdentifier ? `?userIdentifier=${userIdentifier}` : '');
    return this.get(url);
  }

  /**
   * Create new user
   * @param {string} username - Username
   * @param {string} email - Email address
   * @returns {Promise<Object>} User creation result
   */
  async createUser(username, email) {
    return this.post('/users', { username, email });
  }

  /**
   * Get all users
   * @returns {Promise<Object>} Users list
   */
  async getUsers() {
    return this.get('/users');
  }
}

// Create global API service instance
export const apiService = new ApiService();