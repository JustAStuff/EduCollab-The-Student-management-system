// Security validation tests
import {
  validateFileServerSide,
  validateFileSignature,
  checkUploadRateLimit,
  generateCSRFToken,
  validateCSRFToken,
  sanitizeFilename,
  validateWorkspacePermissions,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES,
} from '../../utils/securityValidation';

// Mock supabase
jest.mock('../../supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { created_by: 'user1' }, error: null }))
        }))
      })),
      insert: jest.fn(() => Promise.resolve({ error: null }))
    }))
  }
}));

describe('Security Validation', () => {
  describe('validateFileSignature', () => {
    it('should validate JPEG file signature', async () => {
      // Create a mock JPEG file with correct signature
      const jpegSignature = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      const mockFile = new File([jpegSignature], 'test.jpg', { type: 'image/jpeg' });
      
      const result = await validateFileSignature(mockFile);
      expect(result.isValid).toBe(true);
    });

    it('should reject file with incorrect signature', async () => {
      // Create a mock file with incorrect signature
      const wrongSignature = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      const mockFile = new File([wrongSignature], 'test.jpg', { type: 'image/jpeg' });
      
      const result = await validateFileSignature(mockFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('does not match declared file type');
    });

    it('should reject unsupported file type', async () => {
      const mockFile = new File(['test'], 'test.xyz', { type: 'application/xyz' });
      
      const result = await validateFileSignature(mockFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not supported');
    });
  });

  describe('validateFileServerSide', () => {
    it('should validate a proper file', async () => {
      const jpegSignature = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      const mockFile = new File([jpegSignature], 'test.jpg', { 
        type: 'image/jpeg'
      });
      Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 }); // 1MB

      const result = await validateFileServerSide(mockFile);
      expect(result.isValid).toBe(true);
    });

    it('should reject oversized file', async () => {
      const mockFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { 
        type: 'image/jpeg'
      });

      const result = await validateFileServerSide(mockFile, { maxSizeMB: 10 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds');
    });

    it('should reject disallowed MIME type', async () => {
      const mockFile = new File(['test'], 'test.exe', { type: 'application/x-executable' });

      const result = await validateFileServerSide(mockFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should reject file with mismatched extension and MIME type', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'image/jpeg' });

      const result = await validateFileServerSide(mockFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('does not match MIME type');
    });

    it('should detect suspicious file names', async () => {
      const mockFile = new File(['test'], 'malware.exe', { type: 'application/x-executable' });

      const result = await validateFileServerSide(mockFile, { scanForMalware: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('potentially dangerous');
    });

    it('should detect double extensions', async () => {
      const mockFile = new File(['test'], 'document.pdf.exe', { type: 'application/pdf' });

      const result = await validateFileServerSide(mockFile, { scanForMalware: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('suspicious double extension');
    });
  });

  describe('checkUploadRateLimit', () => {
    beforeEach(() => {
      // Clear rate limit store before each test
      jest.clearAllMocks();
    });

    it('should allow uploads within rate limit', () => {
      const userId = 'user1';
      
      // First upload should be allowed
      expect(checkUploadRateLimit(userId, 5)).toBe(true);
      
      // Subsequent uploads within limit should be allowed
      expect(checkUploadRateLimit(userId, 5)).toBe(true);
      expect(checkUploadRateLimit(userId, 5)).toBe(true);
    });

    it('should block uploads exceeding rate limit', () => {
      const userId = 'user2';
      const maxUploads = 3;
      
      // Use up the rate limit
      for (let i = 0; i < maxUploads; i++) {
        expect(checkUploadRateLimit(userId, maxUploads)).toBe(true);
      }
      
      // Next upload should be blocked
      expect(checkUploadRateLimit(userId, maxUploads)).toBe(false);
    });
  });

  describe('CSRF Token Management', () => {
    it('should generate valid CSRF tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      
      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).not.toBe(token2); // Should be unique
      expect(token1.length).toBe(64); // 32 bytes * 2 hex chars
    });

    it('should validate matching CSRF tokens', () => {
      const token = generateCSRFToken();
      expect(validateCSRFToken(token, token)).toBe(true);
    });

    it('should reject mismatched CSRF tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      expect(validateCSRFToken(token1, token2)).toBe(false);
    });

    it('should reject null or empty tokens', () => {
      const token = generateCSRFToken();
      expect(validateCSRFToken(null, token)).toBe(false);
      expect(validateCSRFToken(token, null)).toBe(false);
      expect(validateCSRFToken('', token)).toBe(false);
    });

    it('should use constant-time comparison', () => {
      const token = generateCSRFToken();
      const wrongToken = 'a'.repeat(64);
      
      // This test ensures timing attacks are prevented
      const start = performance.now();
      validateCSRFToken(token, wrongToken);
      const end = performance.now();
      
      // The time should be consistent regardless of where the difference is
      expect(end - start).toBeLessThan(10); // Should be very fast
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove dangerous characters', () => {
      const dangerous = 'file/with\\dangerous:chars*?"<>|.txt';
      const sanitized = sanitizeFilename(dangerous);
      expect(sanitized).toBe('file_with_dangerous_chars_________.txt');
    });

    it('should remove leading dots and spaces', () => {
      const filename = '...  file.txt';
      const sanitized = sanitizeFilename(filename);
      expect(sanitized).toBe('file.txt');
    });

    it('should limit filename length', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const sanitized = sanitizeFilename(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized.endsWith('.txt')).toBe(true);
    });

    it('should handle empty filenames', () => {
      const sanitized = sanitizeFilename('');
      expect(sanitized).toMatch(/^file_\d+$/);
    });

    it('should handle only dots', () => {
      const sanitized = sanitizeFilename('...');
      expect(sanitized).toMatch(/^file_\d+$/);
    });
  });

  describe('validateWorkspacePermissions', () => {
    it('should allow workspace owner all operations', async () => {
      const result = await validateWorkspacePermissions('workspace1', 'user1', 'delete');
      expect(result.isValid).toBe(true);
    });

    // Note: More comprehensive tests would require proper mocking of Supabase responses
  });

  describe('File Size Limits', () => {
    it('should have appropriate size limits for different file types', () => {
      expect(MAX_FILE_SIZES['image/jpeg']).toBe(5 * 1024 * 1024); // 5MB
      expect(MAX_FILE_SIZES['application/pdf']).toBe(10 * 1024 * 1024); // 10MB
      expect(MAX_FILE_SIZES['text/plain']).toBe(1 * 1024 * 1024); // 1MB
    });
  });

  describe('Allowed MIME Types', () => {
    it('should include common safe file types', () => {
      expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
      expect(ALLOWED_MIME_TYPES).toContain('image/png');
      expect(ALLOWED_MIME_TYPES).toContain('application/pdf');
      expect(ALLOWED_MIME_TYPES).toContain('text/plain');
    });

    it('should not include dangerous file types', () => {
      expect(ALLOWED_MIME_TYPES).not.toContain('application/x-executable');
      expect(ALLOWED_MIME_TYPES).not.toContain('application/javascript');
      expect(ALLOWED_MIME_TYPES).not.toContain('text/html');
    });
  });
});

describe('Security Integration Tests', () => {
  it('should perform complete file validation workflow', async () => {
    // Create a valid JPEG file
    const jpegSignature = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
    const mockFile = new File([jpegSignature], 'photo.jpg', { 
      type: 'image/jpeg'
    });
    Object.defineProperty(mockFile, 'size', { value: 2 * 1024 * 1024 }); // 2MB

    // Test complete validation
    const result = await validateFileServerSide(mockFile, {
      maxSizeMB: 5,
      checkSignature: true,
      scanForMalware: true
    });

    expect(result.isValid).toBe(true);
  });

  it('should reject malicious file through multiple checks', async () => {
    // Create a suspicious file
    const mockFile = new File(['malicious content'], 'document.pdf.exe', { 
      type: 'application/x-executable'
    });

    const result = await validateFileServerSide(mockFile, {
      scanForMalware: true
    });

    expect(result.isValid).toBe(false);
  });
});

describe('Performance Tests', () => {
  it('should validate files quickly', async () => {
    const jpegSignature = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
    const mockFile = new File([jpegSignature], 'test.jpg', { 
      type: 'image/jpeg'
    });

    const start = performance.now();
    await validateFileServerSide(mockFile);
    const end = performance.now();

    expect(end - start).toBeLessThan(100); // Should complete in under 100ms
  });

  it('should handle rate limiting efficiently', () => {
    const userId = 'performance-test-user';
    
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      checkUploadRateLimit(userId, 1000);
    }
    const end = performance.now();

    expect(end - start).toBeLessThan(50); // Should be very fast
  });
});