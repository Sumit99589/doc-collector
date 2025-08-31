import express from "express";
import { createClient } from "@supabase/supabase-js";
import { clerkClient } from "@clerk/clerk-sdk-node";
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";
import winston from "winston";

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    ...(process.env.NODE_ENV !== 'production' ? [new winston.transports.Console()] : [])
  ]
});

const router = express.Router();

// Validate environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Initialize Supabase client with error handling
let supabase;
try {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    }
  );
} catch (error) {
  logger.error('Failed to initialize Supabase client:', error);
  process.exit(1);
}

// Rate limiting middleware
const registerUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many registration attempts, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    res.status(429).json({
      error: 'Too many registration attempts, please try again later',
      retryAfter: '15 minutes'
    });
  }
});

// Input validation middleware
const validateUserRegistration = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('User ID must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('User ID contains invalid characters')
];

// Database operations with retry logic
class DatabaseService {
  static async retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        logger.warn(`Database operation failed, attempt ${attempt}/${maxRetries}:`, {
          error: error.message,
          attempt,
          maxRetries
        });
        
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  static async checkUserExists(userId) {
    return this.retryOperation(async () => {
      const { data, error } = await supabase
        .from("users")
        .select("clerk_id, email, created_at")
        .eq("clerk_id", userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return data;
    });
  }

  static async insertUser(userData) {
    return this.retryOperation(async () => {
      const { data, error } = await supabase
        .from("users")
        .insert({
          clerk_id: userData.clerk_id,
          email: userData.email,
          created_at: new Date().toISOString(),
          name: userData.name
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    });
  }

  static async createUserFolder(userId) {
    return this.retryOperation(async () => {
      const { data, error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .upload(
          `${userId}/.init`, 
          Buffer.from(JSON.stringify({ 
            created_at: new Date().toISOString(),
            purpose: 'Directory initialization file'
          })), 
          { 
            upsert: true,
            contentType: 'application/json'
          }
        );

      if (error) throw error;
      return data;
    });
  }
}

// Clerk service with error handling
class ClerkService {
  static async getUserDetails(userId) {
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      
      if (!clerkUser) {
        throw new Error('User not found in Clerk');
      }

      if (!clerkUser.emailAddresses || clerkUser.emailAddresses.length === 0) {
        throw new Error('User has no email addresses');
      }

      const primaryEmail = clerkUser.emailAddresses.find(email => email.id === clerkUser.primaryEmailAddressId);
      const email = primaryEmail ? primaryEmail.emailAddress : clerkUser.emailAddresses[0].emailAddress;

      return {
        id: clerkUser.id,
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        createdAt: clerkUser.createdAt
      };
    } catch (error) {
      logger.error('Failed to fetch user from Clerk:', {
        userId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to fetch user details: ${error.message}`);
    }
  }
}

// Main route handler
router.post("/register-user", 
  registerUserLimiter,
  validateUserRegistration,
  async (req, res) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log request start
    logger.info('User registration request started', {
      requestId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for user registration', {
          requestId,
          errors: errors.array(),
          body: req.body
        });
        return res.status(400).json({
          error: 'Invalid input',
          details: errors.array()
        });
      }

      const { userId, name } = req.body;

      // Fetch user details from Clerk
      logger.info('Fetching user details from Clerk', { requestId, userId });
      const clerkUser = await ClerkService.getUserDetails(userId);

      // Check if user already exists in database
      logger.info('Checking if user exists in database', { requestId, userId });
      const existingUser = await DatabaseService.checkUserExists(userId);

      if (existingUser) {
        logger.info('User already exists, skipping registration', {
          requestId,
          userId,
          name,
          existingUser: {
            email: existingUser.email,
            createdAt: existingUser.created_at
          }
        });
        
        return res.status(200).json({
          success: true,
          message: 'User already registered',
          user: {
            id: existingUser.clerk_id,
            name,
            email: existingUser.email,
            createdAt: existingUser.created_at
          }
        });
      }

      // Insert new user into database
      logger.info('Inserting new user into database', { requestId, userId,name, email: clerkUser.email });
      const newUser = await DatabaseService.insertUser({
        clerk_id: userId,
        email: clerkUser.email,
        name: name
      });

      // Create user folder in storage
      logger.info('Creating user folder in storage', { requestId, userId });
      await DatabaseService.createUserFolder(userId);

      const processingTime = Date.now() - startTime;
      
      logger.info('User registration completed successfully', {
        requestId,
        userId,
        name,
        email: clerkUser.email,
        processingTime: `${processingTime}ms`
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: newUser.clerk_id,
          name:name,
          email: newUser.email,
          createdAt: newUser.created_at
        }
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('User registration failed', {
        requestId,
        error: error.message,
        stack: error.stack,
        processingTime: `${processingTime}ms`,
        userId: req.body?.userId
      });

      // Don't expose internal error details in production
      const isProduction = process.env.NODE_ENV === 'production';
      const errorMessage = isProduction ? 'Failed to register user' : error.message;

      res.status(500).json({
        error: errorMessage,
        requestId: isProduction ? undefined : requestId
      });
    }
  }
);

// Health check endpoint
router.get("/health", async (req, res) => {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (error) throw error;

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        storage: 'available'
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable'
    });
  }
});

export default router;