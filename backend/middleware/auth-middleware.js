/**
 * Authentication Middleware for Aikira Terminal
 * Validates JWT tokens for protected API routes
 */

const jwt = require('jsonwebtoken');

/**
 * Extracts the JWT token from the request
 * @param {Object} req - Express request object
 * @returns {string|null} Extracted token or null
 */
function extractToken(req) {
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
  
  // Check query parameter
  if (req.query && req.query.token) {
    return req.query.token;
  }
  
  // Check cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  return null;
}

/**
 * Validates the JWT token
 * @param {string} token - JWT token to validate
 * @returns {Object|null} Decoded token payload or null if invalid
 */
function validateToken(token) {
  try {
    // Get JWT secret from environment variables
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not set in environment variables');
      return null;
    }
    
    // Verify and decode token
    const decoded = jwt.verify(token, jwtSecret);
    return decoded;
  } catch (error) {
    console.error('Token validation error:', error.message);
    return null;
  }
}

/**
 * Middleware to authenticate requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function authMiddleware(req, res, next) {
  // Extract token from request
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'No authentication token provided'
    });
  }
  
  // Validate token
  const decodedToken = validateToken(token);
  
  if (!decodedToken) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'Invalid or expired token'
    });
  }
  
  // Attach user information to request
  req.user = {
    id: decodedToken.userId,
    role: decodedToken.role || 'user',
    permissions: decodedToken.permissions || []
  };
  
  // Proceed to next middleware
  next();
}

/**
 * Middleware to check if user has required role
 * @param {string|Array} roles - Required role(s)
 * @returns {Function} Middleware function
 */
function roleCheck(roles) {
  // Convert single role to array
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  
  // Return middleware function
  return (req, res, next) => {
    // Check if user exists (should be set by authMiddleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }
    
    // Check if user has required role
    if (!requiredRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Authorization failed',
        message: 'Insufficient privileges'
      });
    }
    
    // Proceed to next middleware
    next();
  };
}

/**
 * Middleware to check if user has required permission
 * @param {string|Array} permissions - Required permission(s)
 * @returns {Function} Middleware function
 */
function permissionCheck(permissions) {
  // Convert single permission to array
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
  
  // Return middleware function
  return (req, res, next) => {
    // Check if user exists (should be set by authMiddleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }
    
    // Get user permissions or empty array if none
    const userPermissions = req.user.permissions || [];
    
    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(
      permission => userPermissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        error: 'Authorization failed',
        message: 'Insufficient permissions'
      });
    }
    
    // Proceed to next middleware
    next();
  };
}

/**
 * Generates a JWT token for a user
 * @param {Object} user - User object with ID and optional role, permissions
 * @param {number} expiresIn - Token expiration time in seconds
 * @returns {string} JWT token
 */
function generateToken(user, expiresIn = 86400) { // Default 24 hours
  try {
    // Get JWT secret from environment variables
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not set in environment variables');
    }
    
    // Create token payload
    const payload = {
      userId: user.id,
      role: user.role || 'user',
      permissions: user.permissions || []
    };
    
    // Sign token with expiration
    const token = jwt.sign(payload, jwtSecret, { expiresIn });
    
    return token;
  } catch (error) {
    console.error('Token generation error:', error.message);
    throw error;
  }
}

module.exports = {
  authMiddleware,
  roleCheck,
  permissionCheck,
  generateToken
};