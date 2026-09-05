// server/middleware/errorHandler.js

function errorHandler(err, req, res, next) {
  console.error('[API Error]:', err);

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'An internal server error occurred.';
  let code = err.code || 'INTERNAL_ERROR';

  // Map MySQL error codes to clean client-friendly responses
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'A record with these unique details already exists.';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW' || err.errno === 1452) {
    statusCode = 400;
    code = 'FOREIGN_KEY_VIOLATION';
    message = 'Referenced entity does not exist.';
  } else if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
    statusCode = 409;
    code = 'RECORD_IN_USE';
    message = 'Cannot delete or update this record as it is referenced by other records.';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    code = 'DATABASE_UNAVAILABLE';
    message = 'Unable to connect to the MySQL database. Ensure MySQL server is running.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
    errors: err.errors || []
  });
}

module.exports = { errorHandler };
