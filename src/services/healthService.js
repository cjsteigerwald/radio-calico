const database = require('../database/db');

class HealthService {
  static getHealthStatus() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  }

  static async testDatabaseConnection() {
    try {
      const result = await database.testConnection();
      return { success: true, data: result };
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }
}

module.exports = HealthService;