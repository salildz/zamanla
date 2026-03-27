'use strict';

const { ZodError } = require('zod');
const logger = require('../utils/logger');

/**
 * Custom application error.
 */
class AppError extends Error {
  constructor(message, statusCode = 400, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized Express error handler.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Zod validation errors
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message },
    });
  }

  // Custom application errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('Application error', { code: err.code, message: err.message, stack: err.stack });
    } else {
      logger.warn('Client error', { code: err.code, message: err.message });
    }
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  // PostgreSQL errors
  if (err.code && typeof err.code === 'string' && err.code.match(/^[0-9A-Z]{5}$/)) {
    logger.error('Database error', { pgCode: err.code, message: err.message, detail: err.detail });
    return res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'A database error occurred' },
    });
  }

  // Syntax errors in JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'Request body contains invalid JSON' },
    });
  }

  // Unexpected errors
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}

module.exports = errorHandler;
module.exports.AppError = AppError;
