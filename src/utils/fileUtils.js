// File utility functions for task submissions

/**
 * Get file extension from filename
 * @param {string} filename 
 * @returns {string} file extension in lowercase
 */
export const getFileExtension = (filename) => {
  return filename.split('.').pop().toLowerCase();
};

/**
 * Format file size in human readable format
 * @param {number} bytes 
 * @returns {string} formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file type icon based on extension
 * @param {string} filename 
 * @returns {string} Material-UI icon name
 */
export const getFileIcon = (filename) => {
  const ext = getFileExtension(filename);
  
  switch (ext) {
    case 'pdf':
      return 'PictureAsPdf';
    case 'doc':
    case 'docx':
      return 'Description';
    case 'jpg':
    case 'jpeg':
    case 'png':
      return 'Image';
    default:
      return 'AttachFile';
  }
};

/**
 * Validate file for upload
 * @param {File} file 
 * @returns {object} validation result with isValid and error message
 */
export const validateFile = (file) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
  
  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }
  
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 10MB' };
  }
  
  const ext = getFileExtension(file.name);
  if (!allowedTypes.includes(ext)) {
    return { isValid: false, error: 'Only JPG, PNG, PDF, DOC, and DOCX files are allowed' };
  }
  
  return { isValid: true, error: null };
};

/**
 * Generate file path for storage
 * @param {string} workspaceId 
 * @param {string} taskId 
 * @param {string} userId 
 * @param {string} filename 
 * @returns {string} storage file path
 */
export const generateFilePath = (workspaceId, taskId, userId, filename) => {
  const timestamp = Date.now();
  const ext = getFileExtension(filename);
  return `${workspaceId}/${taskId}/${userId}_${timestamp}.${ext}`;
};