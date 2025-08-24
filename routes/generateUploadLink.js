// uploadLinkGenerator.js
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Validate environment variables
if (!process.env.JWT_UPLOAD_SECRET) {
  throw new Error("JWT_UPLOAD_SECRET environment variable is required");
}

const JWT_SECRET = process.env.JWT_UPLOAD_SECRET;
const UPLOAD_BASE_URL = process.env.APP_URL || "http://localhost:3001";

// Input validation
const validateRequest = (body) => {
  const errors = [];

  if (
    !body.clientName ||
    typeof body.clientName !== "string" ||
    body.clientName.trim().length === 0
  ) {
    errors.push("clientName is required and must be a non-empty string");
  }

  if (!body.sections || !Array.isArray(body.sections) || body.sections.length === 0) {
    errors.push("sections is required and must be a non-empty array");
  }

  if (body.sections && Array.isArray(body.sections)) {
    const invalidSections = body.sections.filter(
      (section) => typeof section !== "string" || section.trim().length === 0
    );
    if (invalidSections.length > 0) {
      errors.push("All sections must be non-empty strings");
    }
  }

  if (body.expiresIn && typeof body.expiresIn !== "string") {
    errors.push('expiresIn must be a string (e.g., "7d", "24h", "30m")');
  }

  return errors;
};

// Parse expiration string to seconds
const parseExpiresIn = (expiresIn = "7d") => {
  const units = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
  const match = expiresIn.match(/^(\d+)([smhdw])$/);

  if (!match) {
    throw new Error('Invalid expiresIn format. Use format like "7d", "24h", "30m"');
  }

  const [, value, unit] = match;
  return parseInt(value) * units[unit];
};

// Generate secure folder path
const generateSecurePath = (clientName, section) => {
  const sanitize = (str) =>
    str
      .trim()
      .replace(/[^a-zA-Z0-9\s-_]/g, "")
      .replace(/\s+/g, "_")
      .toLowerCase();

  return `${sanitize(clientName)}/${sanitize(section)}`;
};

// Log upload link generation for audit trail
const logLinkGeneration = async (
  clientName,
  sections,
  generatedBy,
  expiresAt,
  tokenId
) => {
  try {
    const { error } = await supabase.from("upload_link_audit").insert({
      client_name: clientName,
      sections: sections,
      generated_by: generatedBy,
      expires_at: expiresAt,
      token_id: tokenId,
      generated_at: new Date().toISOString(),
      status: "active",
    });

    if (error) {
      console.error("Failed to log upload link generation:", error);
    }
  } catch (err) {
    console.error("Audit logging error:", err);
  }
};

/**
 * Generate a secure upload link for document uploads
 * @param {Object} options - The upload link options
 * @param {string} options.clientName - Name of the client
 * @param {string[]} options.sections - Array of document sections
 * @param {string} [options.expiresIn="7d"] - Expiration time (e.g., "7d", "24h", "30m")
 * @param {string} [options.generatedBy="System"] - Who generated the link
 * @returns {Promise<Object>} Upload link data or error
 */
export const generateUploadLink = async ({
  clientName,
  sections,
  expiresIn = "7d",
  generatedBy = "System"
}) => {
  try {
    const requestData = { clientName, sections, expiresIn, generatedBy };

    // Validate input
    const validationErrors = validateRequest(requestData);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: "Validation failed",
        details: validationErrors,
      };
    }

    // Parse expiration
    let expirationSeconds;
    try {
      expirationSeconds = parseExpiresIn(expiresIn);
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }

    // Create expiration timestamp
    const expiresAt = new Date(Date.now() + expirationSeconds * 1000);

    // Sanitize and validate sections
    const sanitizedSections = sections.map((section) => section.trim().toLowerCase());
    const uniqueSections = [...new Set(sanitizedSections)];

    // Generate folder paths
    const folderPaths = uniqueSections.map((section) =>
      generateSecurePath(clientName, section)
    );

    // Create unique token ID
    const tokenId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create JWT payload
    const tokenPayload = {
      clientName: clientName.trim(),
      sections: uniqueSections,
      folderPaths,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
      jti: tokenId,
      purpose: "document_upload",
      version: "1.0",
    };

    // Generate encrypted token
    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      algorithm: "HS256",
      issuer: "accountancy-platform",
      audience: "document-upload",
    });

    // Create secure upload URL
    const uploadUrl = `${UPLOAD_BASE_URL}/upload/${token}`;

    // Log the link generation for audit purposes
    await logLinkGeneration(clientName, uniqueSections, generatedBy, expiresAt, tokenId);

    // Prepare response
    const response = {
      success: true,
      data: {
        uploadUrl,
        clientName: clientName.trim(),
        sections: uniqueSections,
        expiresAt: expiresAt.toISOString(),
        expiresIn: expiresIn || "7d",
        generatedAt: new Date().toISOString(),
        tokenId: tokenId,
      },
      metadata: {
        folderStructure: folderPaths.map((path, index) => ({
          section: uniqueSections[index],
          storagePath: `client-documents/${path}`,
        })),
        securityInfo: {
          encrypted: true,
          algorithm: "HS256",
          expirationPolicy: "automatic",
          auditLogged: true,
        },
      },
    };

    return response;
  } catch (error) {
    console.error("Upload link generation error:", error);

    const isDevelopment = process.env.NODE_ENV === "development";

    return {
      success: false,
      error: "Internal server error",
      details: isDevelopment ? error.message : "Please try again later",
      timestamp: new Date().toISOString(),
    };
  }
};

// Example usage function
export const exampleUsage = async () => {
  const result = await generateUploadLink({
    clientName: "John Doe",
    sections: ["tax_returns", "receipts", "invoices"],
    expiresIn: "7d",
    generatedBy: "Admin User"
  });

  if (result.success) {
    console.log("Upload URL:", result.data.uploadUrl);
    console.log("Expires at:", result.data.expiresAt);
    return result.data.uploadUrl;
  } else {
    console.error("Error:", result.error);
    return null;
  }
};