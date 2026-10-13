
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required'
      });
    }

    const token = authHeader.split(' ')[1];

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is missing from .env');

      return res.status(500).json({
        success: false,
        message: 'Server authentication is not configured'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: decoded.userId
    };

    next();
  } catch (error) {
    if (
      error.name === 'TokenExpiredError' ||
      error.name === 'JsonWebTokenError'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token'
      });
    }

    console.error('Authentication error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
}

module.exports = authMiddleware;
