const HealthService = require('../services/healthService');

class HealthController {
  static async checkHealth(req, res) {
    const healthStatus = HealthService.getHealthStatus();
    res.json(healthStatus);
  }

  static async checkDatabase(req, res) {
    try {
      const result = await HealthService.testDatabaseConnection();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = HealthController;