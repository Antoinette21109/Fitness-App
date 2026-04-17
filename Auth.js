const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// JWT Secret - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'combo_master_fitness_super_secret_key_2024';

// User Schema (already defined in server.js, but here for reference)
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['member', 'coach', 'admin'], default: 'member' },
  membershipType: { type: String, enum: ['basic', 'premium', 'elite'], default: 'basic' },
  subscriptionEndDate: Date,
  createdAt: { type: Date, default: Date.now },
  profilePicture: String,
  fitnessGoals: [String],
  weight: Number,
  height: Number,
  age: Number,
  emailVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  isActive: { type: Boolean, default: true }
});

const User = mongoose.model('User', UserSchema);

// Hash password middleware
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
};

// Compare password
const comparePassword = async (enteredPassword, hashedPassword) => {
  return await bcrypt.compare(enteredPassword, hashedPassword);
};

// Generate JWT Token
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { 
      userId, 
      email, 
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    },
    JWT_SECRET
  );
};

// Verify JWT Token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Authentication Middleware
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'No token provided',
        message: 'Authentication required' 
      });
    }

    // Check if Bearer token
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({ 
        error: 'Invalid token format',
        message: 'Please provide a valid token' 
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        message: 'Please login again' 
      });
    }

    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        message: 'User no longer exists' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact support.' 
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      message: 'An error occurred during authentication' 
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: `Role ${req.user.role} is not authorized to access this resource`,
        requiredRoles: roles
      });
    }
    
    next();
  };
};

// Admin only middleware
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'This resource is only available to administrators' 
    });
  }
  next();
};

// Coach or Admin middleware
const isCoachOrAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'coach') {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'This resource requires coach or admin privileges' 
    });
  }
  next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;
      
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await User.findById(decoded.userId).select('-password');
        if (user && user.isActive) {
          req.user = user;
        }
      }
    }
    next();
  } catch (error) {
    next();
  }
};

// Generate password reset token
const generatePasswordResetToken = async (email) => {
  const user = await User.findOne({ email });
  if (!user) return null;
  
  const resetToken = jwt.sign(
    { userId: user._id, type: 'password_reset' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();
  
  return resetToken;
};

// Verify password reset token
const verifyPasswordResetToken = async (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'password_reset') return null;
    
    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    return user;
  } catch (error) {
    return null;
  }
};

// Generate email verification token
const generateEmailVerificationToken = async (userId) => {
  const token = jwt.sign(
    { userId, type: 'email_verification' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  await User.findByIdAndUpdate(userId, { verificationToken: token });
  return token;
};

// Verify email token
const verifyEmailToken = async (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'email_verification') return null;
    
    const user = await User.findOne({
      _id: decoded.userId,
      verificationToken: token
    });
    
    if (!user) return null;
    
    user.emailVerified = true;
    user.verificationToken = null;
    await user.save();
    
    return user;
  } catch (error) {
    return null;
  }
};

// Log user activity
const logUserActivity = async (userId, action, details = {}) => {
  try {
    const ActivityLogSchema = new mongoose.Schema({
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      action: String,
      details: mongoose.Schema.Types.Mixed,
      ip: String,
      userAgent: String,
      timestamp: { type: Date, default: Date.now }
    });
    
    const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);
    const log = new ActivityLog({
      user: userId,
      action,
      details,
      ip: details.ip,
      userAgent: details.userAgent
    });
    
    await log.save();
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// Rate limiting for login attempts
const loginAttempts = new Map();

const checkRateLimit = (email) => {
  const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: Date.now() };
  const now = Date.now();
  
  // Reset after 15 minutes
  if (now - attempts.lastAttempt > 15 * 60 * 1000) {
    attempts.count = 0;
  }
  
  if (attempts.count >= 5) {
    return false;
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  loginAttempts.set(email, attempts);
  
  return true;
};

module.exports = {
  User,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  isAdmin,
  isCoachOrAdmin,
  optionalAuthenticate,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  generateEmailVerificationToken,
  verifyEmailToken,
  logUserActivity,
  checkRateLimit,
  JWT_SECRET
};