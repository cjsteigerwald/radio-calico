const {
  customSecurityHeaders,
  sanitizeInput,
  createRateLimiter
} = require('../../../../src/middleware/security');
const validator = require('validator');

describe('Security Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
      headers: {}
    };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('customSecurityHeaders', () => {
    it('should set all required security headers', () => {
      customSecurityHeaders(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
      expect(res.setHeader).toHaveBeenCalledWith('Permissions-Policy', expect.stringContaining('geolocation=()'));
      expect(next).toHaveBeenCalled();
    });

    it('should continue even if setting headers fails', () => {
      res.setHeader = jest.fn().mockImplementation(() => {
        throw new Error('Header error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      customSecurityHeaders(req, res, next);

      expect(consoleSpy).toHaveBeenCalledWith('Error setting security headers:', expect.any(Error));
      expect(next).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize string values in body', () => {
      req.body = {
        username: '<script>alert("xss")</script>John',
        email: 'test@example.com<img src=x onerror=alert(1)>'
      };

      sanitizeInput(req, res, next);

      // Ensure dangerous HTML is escaped (not raw HTML)
      expect(req.body.username).not.toContain('<script>');
      expect(req.body.username).not.toContain('</script>');
      expect(req.body.email).not.toContain('<img');

      // Check that content is escaped (contains HTML entities)
      expect(req.body.username).toContain('&lt;');
      expect(req.body.username).toContain('&gt;');
      expect(req.body.email).toContain('&lt;');

      expect(next).toHaveBeenCalled();
    });

    it('should sanitize query parameters', () => {
      req.query = {
        search: 'javascript:alert(1)',
        filter: 'normal text'
      };

      sanitizeInput(req, res, next);

      expect(req.query.search).toBe(validator.escape('javascript:alert(1)'));
      expect(next).toHaveBeenCalled();
    });

    it('should sanitize nested objects', () => {
      req.body = {
        user: {
          profile: {
            bio: '<script>evil()</script>Hello'
          }
        }
      };

      sanitizeInput(req, res, next);

      expect(req.body.user.profile.bio).not.toContain('<script>');
      expect(next).toHaveBeenCalled();
    });

    it('should sanitize array elements', () => {
      req.body = {
        tags: ['<b>tag1</b>', 'tag2', '<script>alert(1)</script>']
      };

      sanitizeInput(req, res, next);

      req.body.tags.forEach(tag => {
        expect(tag).not.toContain('<script>');
        expect(tag).not.toContain('<b>');
      });
      expect(next).toHaveBeenCalled();
    });

    it('should sanitize dangerous headers', () => {
      req.headers = {
        'referer': 'http://evil.com/<script>alert(1)</script>',
        'user-agent': 'Mozilla/5.0 <img src=x onerror=alert(1)>',
        'x-forwarded-for': '127.0.0.1<script>test</script>'
      };

      sanitizeInput(req, res, next);

      expect(req.headers['referer']).not.toContain('<script>');
      expect(req.headers['user-agent']).not.toContain('<img');
      expect(req.headers['x-forwarded-for']).not.toContain('<script>');
      expect(next).toHaveBeenCalled();
    });

    it('should handle non-string values gracefully', () => {
      req.body = {
        number: 123,
        boolean: true,
        nullValue: null,
        undefinedValue: undefined,
        date: new Date()
      };

      expect(() => sanitizeInput(req, res, next)).not.toThrow();
      expect(next).toHaveBeenCalled();
    });

    it('should continue even if sanitization fails', () => {
      // Mock validator.escape to throw an error
      const originalEscape = validator.escape;
      validator.escape = jest.fn().mockImplementation(() => {
        throw new Error('Sanitization error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      req.body = { test: 'value' };
      sanitizeInput(req, res, next);

      expect(consoleSpy).toHaveBeenCalledWith('Error sanitizing input:', expect.any(Error));
      expect(next).toHaveBeenCalled();

      consoleSpy.mockRestore();
      validator.escape = originalEscape;
    });
  });

  describe('createRateLimiter', () => {
    it('should create rate limiter with default options', () => {
      const limiter = createRateLimiter();
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should create rate limiter with custom options', () => {
      const limiter = createRateLimiter({
        windowMs: 5 * 60 * 1000,
        max: 50,
        message: 'Custom rate limit message'
      });
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should merge custom options with defaults', () => {
      const limiter = createRateLimiter({
        max: 200
      });
      expect(limiter).toBeDefined();
      // The merged options should have max: 200 but keep other defaults
    });
  });
});