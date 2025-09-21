// routes/uploadDocuments.js
import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { logActivity, ACTIVITY_TYPES, ACTIVITY_CATEGORIES } from '../utils/activityLogger.js';
// crypto is no longer needed for filenames
// import crypto from 'crypto'; 


const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Validate environment variables
if (!process.env.JWT_UPLOAD_SECRET) {
  throw new Error('JWT_UPLOAD_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_UPLOAD_SECRET;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'client-documents';

// Rate limiting for uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 upload requests per windowMs
  message: {
    success: false,
    error: 'Too many upload requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers middleware
const securityHeaders = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

// File type validation
const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv'
];

const allowedExtensions = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.odt', '.ods',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.txt', '.csv'
];

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 20, // Maximum 20 files per request
    fieldSize: 1024 * 1024 * 2 // 2MB for other fields
  },
  fileFilter: (req, file, cb) => {
    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
    
    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error(`File extension ${ext} is not allowed`), false);
    }
    
    // Additional security: Check for potential executable files
    const dangerousPatterns = ['.exe', '.bat', '.cmd', '.scr', '.js', '.vbs', '.ps1'];
    if (dangerousPatterns.some(pattern => file.originalname.toLowerCase().includes(pattern))) {
      return cb(new Error('Potentially dangerous file type detected'), false);
    }
    
    cb(null, true);
  }
});

// Get client IP address
const getClientIP = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown'
  );
};

// Validate Clerk User ID format
const validateUserId = (userId) => {
  if (!userId || typeof userId !== 'string') {
    return false;
  }
  
  // Basic validation - Clerk user IDs typically start with 'user_' and have alphanumeric characters
  // Adjust this regex based on your specific Clerk user ID format
  const userIdRegex = /^user_[a-zA-Z0-9]+$/;
  return userIdRegex.test(userId);
};

// Validate upload token
const validateToken = async (token) => {
  try {
    // Verify JWT signature and decode
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'accountancy-platform',
      audience: 'document-upload',
    });

    // Validate token purpose
    if (decoded.purpose !== 'document_upload') {
      return { valid: false, error: 'Invalid token purpose' };
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp <= now) {
      return { valid: false, error: 'Token has expired' };
    }

    // Validate userId exists in token (required for multi-user support)
    if (!decoded.userId) {
      return { valid: false, error: 'Token missing user information' };
    }

    // Check if token exists in audit table and is still active
    const { data: auditRecord, error: auditError } = await supabase
      .from('upload_link_audit')
      .select('*')
      .eq('token_id', decoded.jti)
      .single();

    if (auditError || !auditRecord) {
      return { valid: false, error: 'Token not found in system' };
    }

    if (auditRecord.status !== 'active') {
      return { valid: false, error: `Token is ${auditRecord.status}` };
    }

    // Check database expiration
    const expiresAt = new Date(auditRecord.expires_at);
    if (expiresAt <= new Date()) {
      // Update status to expired
      await supabase
        .from('upload_link_audit')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', auditRecord.id);

      return { valid: false, error: 'Token has expired' };
    }

    return {
      valid: true,
      data: {
        userId: decoded.userId,
        clientName: decoded.clientName,
        sections: decoded.sections,
        folderPaths: decoded.folderPaths,
        tokenId: decoded.jti,
        auditRecord
      }
    };
  } catch (error) {
    console.error('Token validation error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return { valid: false, error: 'Token has expired' };
    }
    if (error.name === 'JsonWebTokenError') {
      return { valid: false, error: 'Invalid token signature' };
    }
    
    return { valid: false, error: 'Token validation failed' };
  }
};

// Upload file to Supabase Storage
const uploadFileToStorage = async (file, filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false, // Don't overwrite existing files
        duplex: 'half'
      });

    if (error) {
      console.error('Supabase storage error:', error);
      // Provide a more user-friendly error for file collisions
      if (error.message.includes('Duplicate')) {
        throw new Error(`A file with the same name already exists at this location.`);
      }
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
};

// Log file upload for audit trail
const logFileUpload = async (tokenId, clientName, section, fileName, filePath, fileSize, uploadedBy, userId, status = 'success') => {
  try {
    const { error } = await supabase
      .from('file_upload_audit')
      .insert({
        token_id: tokenId,
        client_name: clientName,
        section: section,
        original_filename: fileName,
        storage_path: filePath,
        file_size: fileSize,
        uploaded_by: uploadedBy,
        user_id: userId, // Add user_id to audit log
        uploaded_at: new Date().toISOString(),
        status: status
      });

    if (error) {
      console.error('Failed to log file upload:', error);
    }
  } catch (err) {
    console.error('Upload audit logging error:', err);
  }
};

// POST endpoint - Upload documents
router.post('/upload-documents', uploadLimiter, securityHeaders, async (req, res) => {
  // Use multer middleware
  upload.array('files')(req, res, async (multerError) => {
    if (multerError) {
      console.error('Multer error:', multerError);
      
      let errorMessage = 'File upload failed';
      if (multerError.code === 'LIMIT_FILE_SIZE') {
        errorMessage = 'File size exceeds 50MB limit';
      } else if (multerError.code === 'LIMIT_FILE_COUNT') {
        errorMessage = 'Too many files. Maximum 20 files allowed';
      } else if (multerError.message) {
        errorMessage = multerError.message;
      }
      
      return res.status(400).json({
        success: false,
        error: errorMessage
      });
    }

    try {
      const { token, section, clientName, userId } = req.body;
      const files = req.files;
      const clientIP = getClientIP(req);
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Validate required fields
      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Upload token is required'
        });
      }

      if (!section) {
        return res.status(400).json({
          success: false,
          error: 'Section is required'
        });
      }

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files provided'
        });
      }

      // Validate token first to get userId from it
      const tokenValidation = await validateToken(token);
      if (!tokenValidation.valid) {
        return res.status(401).json({
          success: false,
          error: tokenValidation.error
        });
      }

      const tokenData = tokenValidation.data;

      // Extract userId from token (this is the source of truth)
      const tokenUserId = tokenData.userId;

      // If userId is provided in request body, validate it matches the token
      if (userId && userId !== tokenUserId) {
        return res.status(403).json({
          success: false,
          error: 'User ID mismatch with token'
        });
      }

      // Validate user ID format
      if (!validateUserId(tokenUserId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid user ID format in token'
        });
      }

      // Validate section is allowed for this token
      if (!tokenData.sections.includes(section)) {
        return res.status(403).json({
          success: false,
          error: 'Section not authorized for this upload token'
        });
      }

      // Validate client name matches
      if (clientName && clientName !== tokenData.clientName) {
        return res.status(403).json({
          success: false,
          error: 'Client name mismatch'
        });
      }

      // Get the folder path for this section
      const sectionIndex = tokenData.sections.indexOf(section);
      const originalFolderPath = tokenData.folderPaths[sectionIndex];

      if (!originalFolderPath) {
        return res.status(500).json({
          success: false,
          error: 'Invalid folder path configuration'
        });
      }

      // Construct new folder path with user ID
      // Original path: company_name/section
      // New path: user_id/company_name/section
      const newFolderPath = `${tokenUserId}/${originalFolderPath}`;

      // Process each file
      const uploadResults = [];
      const errors = [];

      for (const file of files) {
        try {
          // Use the original filename directly
          const filenameToStore = file.originalname;
          const fullPath = `${newFolderPath}/${filenameToStore}`;

          // Upload to Supabase Storage
          await uploadFileToStorage(file, fullPath);

          // Log successful upload
          await logFileUpload(
            tokenData.tokenId,
            tokenData.clientName,
            section,
            file.originalname,
            fullPath,
            file.size,
            clientIP,
            tokenUserId, // Use userId from token
            'success'
          );

          // Log activity
          await logActivity({
            userId: tokenUserId,
            type: ACTIVITY_TYPES.FILE_UPLOADED,
            category: ACTIVITY_CATEGORIES.FILE,
            title: `File uploaded for "${tokenData.clientName}"`,
            description: `Uploaded file "${file.originalname}" in section "${section}"`,
            clientName: tokenData.clientName,
            metadata: {
              fileName: file.originalname,
              section,
              fileSize: file.size,
              contentType: file.mimetype,
              storagePath: fullPath
            }
          });

          uploadResults.push({
            originalName: file.originalname,
            storedName: filenameToStore,
            storagePath: fullPath,
            size: file.size,
            contentType: file.mimetype,
            uploadedAt: new Date().toISOString()
          });

        } catch (fileError) {
          console.error(`Error uploading file ${file.originalname}:`, fileError);
          
          // Log failed upload
          await logFileUpload(
            tokenData.tokenId,
            tokenData.clientName,
            section,
            file.originalname,
            '',
            file.size,
            clientIP,
            tokenUserId, // Use userId from token
            'failed'
          );

          errors.push({
            filename: file.originalname,
            error: fileError.message
          });
        }
      }

      // Update token usage statistics
      try {
        const { data: currentUsage } = await supabase
          .from('upload_link_audit')
          .select('files_uploaded, last_used_at')
          .eq('id', tokenData.auditRecord.id)
          .single();

        const totalFilesUploaded = (currentUsage?.files_uploaded || 0) + uploadResults.length;

        await supabase
          .from('upload_link_audit')
          .update({
            files_uploaded: totalFilesUploaded,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', tokenData.auditRecord.id);
      } catch (statsError) {
        console.error('Failed to update usage statistics:', statsError);
      }

      // Prepare response
      const response = {
        success: true,
        data: {
          filesUploaded: uploadResults.length,
          totalFiles: files.length,
          section: section,
          clientName: tokenData.clientName,
          userId: tokenUserId, // Use userId from token
          uploadedAt: new Date().toISOString(),
          files: uploadResults
        }
      };

      if (errors.length > 0) {
        response.warnings = {
          failedUploads: errors.length,
          errors: errors
        };
      }

      try{
        await supabase
      .from("clients")
      .update({
            status: "active",
          })
      .eq("client_name", clientName)
      }catch(error){
        console.log("error in changing the status :", error);
      }


      res.status(200).json(response);

    } catch (error) {
      console.error('Upload endpoint error:', error);

      const isDevelopment = process.env.NODE_ENV === 'development';

      res.status(500).json({
        success: false,
        error: 'Internal server error during upload',
        details: isDevelopment ? error.message : 'Please try again later',
        timestamp: new Date().toISOString()
      });
    }
  });
});

// GET endpoint - Health check
router.get('/health', securityHeaders, (req, res) => {
  res.json({
    service: 'Document Upload Service',
    status: 'operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    storageBucket: STORAGE_BUCKET
  });
});

export default router;