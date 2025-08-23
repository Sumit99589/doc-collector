// routes/validateToken.js
import express from "express";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Rate limiting for token validation
const validationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 validation requests per windowMs
  message: {
    valid: false,
    error: "Too many validation requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers middleware
const setSecurityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  next();
};

// Get client IP address
const getClientIP = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown"
  );
};

// Validate token structure
const validateTokenStructure = (token) => {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Invalid token format" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, error: "Invalid JWT structure" };
  }

  return { valid: true };
};

// Enhanced token validation with database checks
const validateToken = async (token, clientIP, userAgent) => {
  try {
    // Structure validation
    const structureCheck = validateTokenStructure(token);
    if (!structureCheck.valid) {
      return { valid: false, error: structureCheck.error };
    }

    // Verify JWT signature and decode
    const decoded = jwt.verify(token, process.env.JWT_UPLOAD_SECRET, {
      algorithms: ["HS256"],
      issuer: "accountancy-platform",
      audience: "document-upload",
    });

    // Validate token purpose
    if (decoded.purpose !== "document_upload") {
      return { valid: false, error: "Invalid token purpose" };
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp <= now) {
      return { valid: false, error: "Token has expired" };
    }

    // Check if token exists in audit table and is still active
    const { data: auditRecord, error: auditError } = await supabase
      .from("upload_link_audit")
      .select("*")
      .eq("token_id", decoded.jti)
      .single();

    if (auditError || !auditRecord) {
      return { valid: false, error: "Token not found in system" };
    }

    if (auditRecord.status !== "active") {
      return { valid: false, error: `Token is ${auditRecord.status}` };
    }

    // Check database expiration
    const expiresAt = new Date(auditRecord.expires_at);
    if (expiresAt <= new Date()) {
      // Update status to expired
      await supabase
        .from("upload_link_audit")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", auditRecord.id);

      return { valid: false, error: "Token has expired" };
    }

    // Validate client name matches
    if (decoded.clientName !== auditRecord.client_name) {
      return { valid: false, error: "Token client mismatch" };
    }

    // Log successful validation
    try {
      await supabase.from("token_validation_log").insert({
        token_id: decoded.jti,
        client_ip: clientIP,
        user_agent: userAgent,
        validation_result: "success",
        validated_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error("Failed to log validation:", logError);
    }

    return {
      valid: true,
      data: {
        clientName: decoded.clientName,
        sections: decoded.sections,
        folderPaths: decoded.folderPaths,
        expiresAt: expiresAt.toISOString(),
        tokenId: decoded.jti,
        auditRecord,
      },
    };
  } catch (error) {
    console.error("Token validation error:", error);

    // Log failed validation attempt
    try {
      await supabase.from("token_validation_log").insert({
        token_id: "unknown",
        client_ip: clientIP,
        user_agent: userAgent,
        validation_result: "failed",
        error_message: error.message,
        validated_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error("Failed to log validation failure:", logError);
    }

    if (error.name === "TokenExpiredError") {
      return { valid: false, error: "Token has expired" };
    }
    if (error.name === "JsonWebTokenError") {
      return { valid: false, error: "Invalid token signature" };
    }

    return { valid: false, error: "Token validation failed" };
  }
};

// GET /validate-token/:token - Validate upload token
router.get(
  "/validate-token/:token",
  validationLimiter,
  setSecurityHeaders,
  async (req, res) => {
    try {
      const { token } = req.params;
      const clientIP = getClientIP(req);
      const userAgent = req.headers["user-agent"] || "unknown";

      if (!token) {
        return res.status(400).json({
          valid: false,
          error: "Token parameter required",
        });
      }

      // Validate the token
      const validation = await validateToken(token, clientIP, userAgent);

      if (!validation.valid) {
        return res.status(401).json({
          valid: false,
          error: validation.error,
          timestamp: new Date().toISOString(),
        });
      }

      // Return successful validation
      return res.status(200).json({
        valid: true,
        data: validation.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Token validation API error:", error);

      return res.status(500).json({
        valid: false,
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// HEAD /validate-token/:token - Health check
router.head("/validate-token/:token", setSecurityHeaders, (req, res) => {
  res.status(200).end();
});

// export default router;
export default router;
