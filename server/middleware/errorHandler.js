// server/middleware/errorHandler.js

function errorHandler(err, req, res, next) {
  console.error('[API Error]:', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An internal server error occurred.';
  const code = err.code || 'INTERNAL_ERROR';

  res.status(statusCode).json({
    success: false,
    message,
    code,
    errors: err.errors || []
  });
}

module.exports = { errorHandler };
