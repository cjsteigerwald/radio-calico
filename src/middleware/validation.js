const validateContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        success: false,
        error: 'Content-Type must be application/json'
      });
    }
  }
  next();
};

const validateRequestSize = (req, res, next) => {
  const maxSize = 1024 * 1024; // 1MB
  const contentLength = parseInt(req.get('Content-Length') || '0');

  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      error: 'Request payload too large'
    });
  }

  next();
};

module.exports = {
  validateContentType,
  validateRequestSize
};