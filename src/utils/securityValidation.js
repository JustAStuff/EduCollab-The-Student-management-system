// Security validation utilities for file uploads and operations
import { supabase } from '../supabaseClient';

/**
 * Server-side file type validation using magic numbers (file signatures)
 */
const FILE_SIGNATURES = {
  // Images
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  
  // Documents
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
  'application/msword': [0xD0, 0xCF, 0x11, 0xE0],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04],
  
  // Archives (for Office formats)
  'application/zip': [0x50, 0x4B, 0x03, 0x04],
};

/**
 * Allowed MIME types for uploads
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

/**
 * Maximum file sizes by type (in bytes)
 */
export const MAX_FILE_SIZES = {
  'image/jpeg': 5 * 1024 * 1024,    // 5MB for images
  'image/png': 5 * 1024 * 1024,     // 5MB for images
  'image/gif': 2 * 1024 * 1024,     // 2MB for GIFs
  'image/webp': 5 * 1024 * 1024,    // 5MB for WebP
  'application/pdf': 10 * 1024 * 1024, // 10MB for PDFs
  'application/msword': 10 * 1024 * 1024, // 10MB for DOC
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 10 * 1024 * 1024, // 10MB for DOCX
  'text/plain': 1 * 1024 * 1024,    // 1MB for text files
};

/**
 * Rate limiting storage - in production, use Redis or database
 */
const rateLimitStore = new Map();

/**
 * Validate file type using magic numbers (file signature)
 * @param {File} file - File to validate
 * @returns {Promise<{isValid: boolean, error?: string}>}
 */
export async function validateFileSignature(file) {
  try {
    const arrayBuffer = await file.slice(0, 8).arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Check if file signature matches declared MIME type
    const expectedSignature = FILE_SIGNATURES[file.type];
    if (!expectedSignature) {
      return {
        isValid: false,
        error: `File type ${file.type} is not supported`
      };
    }
    
    // Compare first bytes with expected signature
    for (let i = 0; i < expectedSignature.length; i++) {
      if (uint8Array[i] !== expectedSignature[i]) {
        return {
          isValid: false,
          error: 'File content does not match declared file type'
        };
      }
    }
    
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to validate file signature'
    };
  }
}

/**
 * Enhanced server-side file validation
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Promise<{isValid: boolean, error?: string}>}
 */
export async function validateFileServerSide(file, options = {}) {
  const {
    maxSizeMB = 10,
    allowedTypes = ALLOWED_MIME_TYPES,
    checkSignature = true,
    scanForMalware = false
  } = options;
  
  // Basic null check
  if (!file) {
    return {
      isValid: false,
      error: 'No file provided'
    };
  }
  
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`
    };
  }
  
  // Check specific size limits by type
  const typeMaxSize = MAX_FILE_SIZES[file.type];
  if (typeMaxSize && file.size > typeMaxSize) {
    return {
      isValid: false,
      error: `File size exceeds ${Math.round(typeMaxSize / (1024 * 1024))}MB limit for ${file.type}`
    };
  }
  
  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed`
    };
  }
  
  // Validate file extension matches MIME type
  const extension = file.name.split('.').pop().toLowerCase();
  const mimeToExtension = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'application/pdf': ['pdf'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
    'text/plain': ['txt']
  };
  
  const validExtensions = mimeToExtension[file.type];
  if (validExtensions && !validExtensions.includes(extension)) {
    return {
      isValid: false,
      error: `File extension .${extension} does not match MIME type ${file.type}`
    };
  }
  
  // Check file signature if enabled
  if (checkSignature) {
    const signatureCheck = await validateFileSignature(file);
    if (!signatureCheck.isValid) {
      return signatureCheck;
    }
  }
  
  // Basic malware scanning (placeholder for future implementation)
  if (scanForMalware) {
    const malwareCheck = await scanFileForMalware(file);
    if (!malwareCheck.isValid) {
      return malwareCheck;
    }
  }
  
  return { isValid: true };
}

/**
 * Placeholder for malware scanning - can be integrated with services like VirusTotal
 * @param {File} file - File to scan
 * @returns {Promise<{isValid: boolean, error?: string}>}
 */
async function scanFileForMalware(file) {
  // This is a placeholder implementation
  // In production, integrate with services like:
  // - VirusTotal API
  // - ClamAV
  // - AWS GuardDuty Malware Protection
  // - Microsoft Defender for Cloud
  
  try {
    // Basic checks for suspicious file names
    const suspiciousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.pif$/i,
      /\.com$/i,
      /\.vbs$/i,
      /\.js$/i,
      /\.jar$/i,
    ];
    
    const fileName = file.name.toLowerCase();
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(fileName)) {
        return {
          isValid: false,
          error: 'File type is potentially dangerous and not allowed'
        };
      }
    }
    
    // Check for double extensions (e.g., file.pdf.exe)
    const parts = file.name.split('.');
    if (parts.length > 2) {
      const secondToLast = parts[parts.length - 2].toLowerCase();
      const dangerousExtensions = ['exe', 'bat', 'cmd', 'scr', 'pif', 'com', 'vbs', 'js'];
      if (dangerousExtensions.includes(secondToLast)) {
        return {
          isValid: false,
          error: 'File has suspicious double extension'
        };
      }
    }
    
    return { isValid: true };
  } catch (error) {
    console.error('Malware scan error:', error);
    return {
      isValid: false,
      error: 'Failed to scan file for malware'
    };
  }
}

/**
 * Rate limiting for file uploads
 * @param {string} userId - User ID
 * @param {number} maxUploads - Maximum uploads per hour
 * @returns {boolean} Whether upload is allowed
 */
export function checkUploadRateLimit(userId, maxUploads = 10) {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  if (!rateLimitStore.has(userId)) {
    rateLimitStore.set(userId, []);
  }
  
  const userUploads = rateLimitStore.get(userId);
  
  // Remove uploads older than 1 hour
  const recentUploads = userUploads.filter(timestamp => now - timestamp < oneHour);
  rateLimitStore.set(userId, recentUploads);
  
  // Check if user has exceeded rate limit
  if (recentUploads.length >= maxUploads) {
    return false;
  }
  
  // Add current upload timestamp
  recentUploads.push(now);
  rateLimitStore.set(userId, recentUploads);
  
  return true;
}

/**
 * Generate CSRF token for file operations
 * @returns {string} CSRF token
 */
export function generateCSRFToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate CSRF token with flexible handling for development
 * @param {string} token - Token to validate
 * @param {string} storedToken - Stored token to compare against
 * @returns {boolean} Whether token is valid
 */
export function validateCSRFToken(token, storedToken) {
  // In development, allow missing tokens and generate new ones if needed
  if (process.env.NODE_ENV === 'development') {
    if (!token || !storedToken) {
      // Generate and store a new token for development
      const newToken = generateCSRFToken();
      sessionStorage.setItem('csrf_token', newToken);
      return true;
    }
  }
  
  // In production, require both tokens
  if (!token || !storedToken) {
    return false;
  }
  
  // Use constant-time comparison to prevent timing attacks
  if (token.length !== storedToken.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Audit logging for sensitive operations
 * @param {string} operation - Operation being performed
 * @param {Object} details - Operation details
 * @param {string} userId - User performing the operation
 */
export async function auditLog(operation, details, userId) {
  try {
    const auditEntry = {
      operation,
      details: JSON.stringify(details),
      user_id: userId,
      timestamp: new Date().toISOString(),
      ip_address: null, // Would be populated from request in real server environment
      user_agent: navigator.userAgent
    };
    
    // In production, this would be sent to a secure audit logging service
    // For now, we'll use Supabase to store audit logs
    const { error } = await supabase
      .from('audit_logs')
      .insert(auditEntry);
    
    if (error) {
      console.error('Failed to write audit log:', error);
    }
  } catch (error) {
    console.error('Audit logging error:', error);
  }
}

/**
 * Sanitize filename to prevent path traversal attacks
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename) {
  // Remove path separators and dangerous characters
  let sanitized = filename.replace(/[\/\\:*?"<>|]/g, '_');
  
  // Remove leading dots and spaces
  sanitized = sanitized.replace(/^[.\s]+/, '');
  
  // Limit length
  if (sanitized.length > 255) {
    const extension = sanitized.split('.').pop();
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    sanitized = nameWithoutExt.substring(0, 255 - extension.length - 1) + '.' + extension;
  }
  
  // Ensure filename is not empty
  if (!sanitized || sanitized === '.') {
    sanitized = 'file_' + Date.now();
  }
  
  return sanitized;
}

/**
 * Validate workspace permissions for file operations
 * @param {string} workspaceId - Workspace ID
 * @param {string} userId - User ID
 * @param {string} operation - Operation being performed
 * @returns {Promise<{isValid: boolean, error?: string}>}
 */
export async function validateWorkspacePermissions(workspaceId, userId, operation) {
  try {
    // Check if user is workspace owner
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('created_by')
      .eq('id', workspaceId)
      .single();
    
    if (workspaceError) {
      return {
        isValid: false,
        error: 'Workspace not found'
      };
    }
    
    const isOwner = workspace.created_by === userId;
    
    // Check if user is workspace member
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();
    
    const isMember = !membershipError && membership;
    
    // Define operation permissions
    const permissions = {
      'upload': isMember || isOwner,
      'download': isMember || isOwner,
      'delete': isOwner, // Only owners can delete files
      'view': isMember || isOwner,
    };
    
    if (!permissions[operation]) {
      return {
        isValid: false,
        error: `Insufficient permissions for ${operation} operation`
      };
    }
    
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to validate workspace permissions'
    };
  }
}

export default {
  validateFileServerSide,
  validateFileSignature,
  checkUploadRateLimit,
  generateCSRFToken,
  validateCSRFToken,
  auditLog,
  sanitizeFilename,
  validateWorkspacePermissions,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES,
};