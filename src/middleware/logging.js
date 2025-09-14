const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Log the incoming request
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    res.end = originalEnd;
    const duration = Date.now() - startTime;
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    res.end(chunk, encoding);
  };

  next();
};

module.exports = { requestLogger };