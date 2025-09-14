const UserService = require('../services/userService');

class UserController {
  static async createUser(req, res) {
    const { username, email } = req.body;

    try {
      const result = await UserService.createUser(username, email);
      res.json({ success: true, ...result });
    } catch (error) {
      if (error.message.includes('already exists')) {
        res.status(409).json({ success: false, error: error.message });
      } else if (error.message.includes('required') || error.message.includes('Invalid')) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  static async getAllUsers(req, res) {
    try {
      const users = await UserService.getAllUsers();
      res.json({ success: true, users });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = UserController;