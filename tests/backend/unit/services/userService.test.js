const UserService = require('../../../../src/services/userService');

describe('UserService', () => {
  describe('validateUserInput', () => {
    it('should return empty array for valid input', () => {
      const errors = UserService.validateUserInput('testuser', 'test@example.com');
      expect(errors).toEqual([]);
    });

    it('should return error for missing username', () => {
      const errors = UserService.validateUserInput('', 'test@example.com');
      expect(errors).toContain('Username is required');
    });

    it('should return error for missing email', () => {
      const errors = UserService.validateUserInput('testuser', '');
      expect(errors).toContain('Email is required');
    });

    it('should return error for invalid email format', () => {
      const errors = UserService.validateUserInput('testuser', 'invalid-email');
      expect(errors).toContain('Invalid email format');
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const errors = UserService.validateUserInput('', 'invalid-email');
      expect(errors).toHaveLength(2);
      expect(errors).toContain('Username is required');
      expect(errors).toContain('Invalid email format');
    });

    it('should handle whitespace in email validation', () => {
      // Email with spaces is invalid
      const errors = UserService.validateUserInput('  testuser  ', '  test@example.com  ');
      // The email regex will fail on padded email
      expect(errors).toContain('Invalid email format');
    });

    it('should accept usernames with special characters (no username format validation)', () => {
      // The actual implementation doesn't validate username format beyond presence
      const errors = UserService.validateUserInput('test@user', 'test@example.com');
      expect(errors).toEqual([]);
    });

    it('should accept any non-empty username', () => {
      // No length restrictions in actual implementation
      const errors = UserService.validateUserInput('ab', 'test@example.com');
      expect(errors).toEqual([]);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email format', () => {
      expect(UserService.isValidEmail('test@example.com')).toBe(true);
      expect(UserService.isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email format', () => {
      expect(UserService.isValidEmail('invalid')).toBe(false);
      expect(UserService.isValidEmail('invalid@')).toBe(false);
      expect(UserService.isValidEmail('@invalid.com')).toBe(false);
      expect(UserService.isValidEmail('invalid@domain')).toBe(false);
    });
  });

  // Skip database-dependent tests since we're testing in isolation
  // These would be better as integration tests
  describe('createUser', () => {
    it('validates input before database operation', async () => {
      await expect(UserService.createUser('', 'invalid'))
        .rejects
        .toThrow('Username is required, Invalid email format');
    });
  });

  describe('getAllUsers', () => {
    it('requires database integration (skipped in unit tests)', () => {
      // This method directly calls the database
      // Should be tested in integration tests with proper database setup
      expect(UserService.getAllUsers).toBeDefined();
    });
  });
});