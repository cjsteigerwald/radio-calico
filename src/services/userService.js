const Database = require('../database');

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
      const user = await Database.createUser(username.trim(), email.trim().toLowerCase());
      return {
        userId: user.id || user.userId,
        username: user.username,
        email: user.email,
        message: 'User created successfully'
      };
    } catch (error) {
      // Handle both SQLite and PostgreSQL unique constraint errors
      if (error.message.includes('UNIQUE constraint failed') ||
          error.code === '23505') { // PostgreSQL unique violation
        throw new Error('Username or email already exists');
      }
      throw error;
    }
  }

  static async getAllUsers() {
    const users = await Database.getUsers();
    return users;
  }

  static async getUserByUsername(username) {
    const user = await Database.getUserByUsername(username);
    return user;
  }
}

module.exports = UserService;