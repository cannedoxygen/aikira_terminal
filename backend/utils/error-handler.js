/**
 * Error Handler Utility for Aikira Terminal
 * Provides centralized error handling for the application
 */

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
    constructor(message, statusCode, details = null) {
      super(message);
      this.name = this.constructor.name;
      this.statusCode = statusCode;
      this.details = details;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Error handler middleware for Express
   * @param {Error} err - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  function errorHandlerMiddleware(err, req, res, next) {
    console.error('Error:', err);
    
    // Get environmental variables
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Set default values
    let statusCode = 500;
    let message = 'Internal Server Error';
    let details = null;
    let stack = null;
    
    // Check for specific error types
    if (err instanceof ApiError) {
      statusCode = err.statusCode;
      message = err.message;
      details = err.details;
      stack = err.stack;
    } else if (err.name === 'ValidationError') {
      // Handle validation errors (e.g., from Joi or Mongoose)
      statusCode = 400;
      message = 'Validation Error';
      details = err.details || err.message;
      stack = err.stack;
    } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
      // Handle authentication errors
      statusCode = 401;
      message = 'Authentication Error';
      details = err.message;
      stack = err.stack;
    } else if (err.name === 'ForbiddenError') {
      // Handle authorization errors
      statusCode = 403;
      message = 'Authorization Error';
      details = err.message;
      stack = err.stack;
    } else if (err.name === 'NotFoundError') {
      // Handle not found errors
      statusCode = 404;
      message = 'Resource Not Found';
      details = err.message;
      stack = err.stack;
    } else if (err.code === 'LIMIT_FILE_SIZE') {
      // Handle file size errors from multer
      statusCode = 400;
      message = 'File Too Large';
      details = 'The uploaded file exceeds the maximum allowed size.';
      stack = err.stack;
    } else {
      // Generic error handling
      stack = err.stack;
      details = err.message;
    }
    
    // Log the error (could be extended to log to a file or service)
    console.error(`[${statusCode}] ${message}: ${details || 'No details provided'}`);
    
    // Prepare response
    const errorResponse = {
      status: 'error',
      message,
      statusCode
    };
    
    // Add details in development or if they exist
    if (details || isDevelopment) {
      errorResponse.details = details || err.message;
    }
    
    // Add stack trace in development
    if (isDevelopment && stack) {
      errorResponse.stack = stack;
    }
    
    // Send response
    res.status(statusCode).json(errorResponse);
  }
  
  /**
   * Creates a generic API error with appropriate status code
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {any} details - Additional error details
   * @returns {ApiError} Custom API error
   */
  function createError(message, statusCode = 500, details = null) {
    return new ApiError(message, statusCode, details);
  }
  
  /**
   * Creates a 400 Bad Request error
   * @param {string} message - Error message
   * @param {any} details - Additional error details
   * @returns {ApiError} Bad Request error
   */
  function badRequest(message = 'Bad Request', details = null) {
    return createError(message, 400, details);
  }
  
  /**
   * Creates a 401 Unauthorized error
   * @param {string} message - Error message
   * @param {any} details - Additional error details
   * @returns {ApiError} Unauthorized error
   */
  function unauthorized(message = 'Unauthorized', details = null) {
    return createError(message, 401, details);
  }
  
  /**
   * Creates a 403 Forbidden error
   * @param {string} message - Error message
   * @param {any} details - Additional error details
   * @returns {ApiError} Forbidden error
   */
  function forbidden(message = 'Forbidden', details = null) {
    return createError(message, 403, details);
  }
  
  /**
   * Creates a 404 Not Found error
   * @param {string} message - Error message
   * @param {any} details - Additional error details
   * @returns {ApiError} Not Found error
   */
  function notFound(message = 'Resource Not Found', details = null) {
    return createError(message, 404, details);
  }
  
  /**
   * Creates a 409 Conflict error
   * @param {string} message - Error message
   * @param {any} details - Additional error details
   * @returns {ApiError} Conflict error
   */
  function conflict(message = 'Resource Conflict', details = null) {
    return createError(message, 409, details);
  }
  
  /**
   * Creates a 429 Too Many Requests error
   * @param {string} message - Error message
   * @param {any} details - Additional error details
   * @returns {ApiError} Too Many Requests error
   */
  function tooManyRequests(message = 'Too Many Requests', details = null) {
    return createError(message, 429, details);
  }
  
  /**
   * Creates a 500 Internal Server Error
   * @param {string} message - Error message
   * @param {any} details - Additional error details
   * @returns {ApiError} Internal Server Error
   */
  function serverError(message = 'Internal Server Error', details = null) {
    return createError(message, 500, details);
  }
  
  /**
   * Async route handler wrapper to catch errors
   * @param {Function} fn - Async route handler function
   * @returns {Function} Express middleware function with error handling
   */
  function asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
  
  // Export all error utilities
  module.exports = {
    ApiError,
    errorHandlerMiddleware,
    createError,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    conflict,
    tooManyRequests,
    serverError,
    asyncHandler
  };