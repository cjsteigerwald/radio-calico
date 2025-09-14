const database = require('../database/db');

class UserService {
  static validateUserInput(username, email) {
    const errors = [];

    if (!username || username.trim().length === 0) {
      errors.push('Username is required');
    }

    if (!email || email.trim().length === 0) {
      errors.push('Email is required');
    }

    if (email && !this.isValidEmail(email)) {
      errors.push('Invalid email format');
    }

    return errors;
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static async createUser(username, email) {
    const validationErrors = this.validateUserInput(username, email);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(', '));
    }

    try {
      const userId = await database.createUser(username.trim(), email.trim().toLowerCase());
      return { userId, message: 'User created successfully' };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('Username or email already exists');
      }
      throw error;
    }
  }

  static async getAllUsers() {
    const users = await database.getAllUsers();
    return users;
  }
}

module.exports = UserService;