const corsMiddleware = require('./cors');
const errorHandler = require('./errorHandler');
const { validateContentType, validateRequestSize } = require('./validation');
const { requestLogger } = require('./logging');

module.exports = {
  corsMiddleware,
  errorHandler,
  validateContentType,
  validateRequestSize,
  requestLogger
};