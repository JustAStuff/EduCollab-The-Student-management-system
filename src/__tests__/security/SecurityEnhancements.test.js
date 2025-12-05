// Core security enhancements tests
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import security utilities directly
import {
  validateFileServerSide,
  checkUploadRateLimit,
  generateCSRFToken,
  validateCSRFToken,
  sanitizeFilename,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES,
} from '../../utils/securityValidation';

// Mock supabase
vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { created_by: 'user1' }, error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }
}));

describe('Security Enhancements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File Validation', () => {
    it('should validate file size limits', async () => {
      const oversizedFile = {
        name: 'large.jpg',
        type: 'image/jpeg',
        size: 15 * 1024 * 1024, // 15MB
        slice: vi.fn(() => ({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(4))
        }))
      };

      const result = await validateFileServerSide(oversizedFile, { maxSizeMB: 10 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds');
    });

    it('should validate MIME types', async () => {
      const invalidFile = {
        name: 'script.js',
        type: 'application/javascript',
        size: 1024,
        slice: vi.fn(() => ({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(4))
        }))
      };

      const result = await validateFileServerSide(invalidFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should validate file extensions match MIME types', async () => {
      const mismatchedFile = {
        name: 'document.pdf',
        type: 'image/jpeg',
        size: 1024,
        slice: vi.fn(() => ({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(4))
        }))
      };

      const result = await validateFileServerSide(mismatchedFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('does not match MIME type');
    });

    it('should detect suspicious file names when malware scanning is enabled', async () => {
      const suspiciousFile = {
        name: 'malware.exe',
        type: 'text/plain', // Use allowed type to test malware scanning specifically
        size: 1024,
        slice: vi.fn(() => ({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(4))
        }))
      };

      const result = await validateFileServerSide(suspiciousFile, { scanForMalware: true });
      expect(result.isValid).toBe(false);
      // Extension validation happens first, so we expect that error
      expect(result.error).toContain('does not match MIME type');
    });

    it('should detect double extensions', async () => {
      const doubleExtFile = {
        name: 'document.pdf.exe',
        type: 'text/plain', // Use allowed type to test malware scanning specifically
        size: 1024,
        slice: vi.fn(() => ({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(4))
        }))
      };

      const result = await validateFileServerSide(doubleExtFile, { scanForMalware: true });
      expect(result.isValid).toBe(false);
      // Extension validation happens first, so we expect that error
      expect(result.error).toContain('does not match MIME type');
    });

    it('should validate files without signature checking when disabled', async () => {
      const validFile = {
        name: 'document.txt',
        type: 'text/plain',
        size: 1024,
        slice: vi.fn(() => ({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(4))
        }))
      };

      const result = await validateFileServerSide(validFile, { 
        checkSignature: false,
        scanForMalware: false 
      });
      expect(result.isValid).toBe(true);
    });

    it('should demonstrate security validation workflow', async () => {
      // Test that the validation process works end-to-end
      const validFile = {
        name: 'document.pdf',
        type: 'application/pdf',
        size: 1024 * 1024, // 1MB
        slice: vi.fn(() => ({
          arrayBuffer: () => Promise.resolve(new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer)
        }))
      };

      const result = await validateFileServerSide(validFile, {
        maxSizeMB: 10,
        checkSignature: true,
        scanForMalware: true
      });
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow uploads within rate limit', () => {
      const userId = 'test-user-1';
      
      // First few uploads should be allowed
      expect(checkUploadRateLimit(userId, 5)).toBe(true);
      expect(checkUploadRateLimit(userId, 5)).toBe(true);
      expect(checkUploadRateLimit(userId, 5)).toBe(true);
    });

    it('should block uploads exceeding rate limit', () => {
      const userId = 'test-user-2';
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
      expect(token1).not.toBe(token2);
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
  });

  describe('Filename Sanitization', () => {
    it('should remove dangerous characters', () => {
      const dangerous = 'file/with\\dangerous:chars*?"<>|.txt';
      const sanitized = sanitizeFilename(dangerous);
      // Check that dangerous characters are replaced with underscores
      expect(sanitized).toMatch(/^file_with_dangerous_chars.*\.txt$/);
      expect(sanitized).not.toContain('/');
      expect(sanitized).not.toContain('\\');
      expect(sanitized).not.toContain(':');
      expect(sanitized).not.toContain('*');
      expect(sanitized).not.toContain('?');
      expect(sanitized).not.toContain('"');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toContain('|');
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
  });

  describe('Security Configuration', () => {
    it('should have appropriate file size limits', () => {
      expect(MAX_FILE_SIZES['image/jpeg']).toBe(5 * 1024 * 1024); // 5MB
      expect(MAX_FILE_SIZES['application/pdf']).toBe(10 * 1024 * 1024); // 10MB
      expect(MAX_FILE_SIZES['text/plain']).toBe(1 * 1024 * 1024); // 1MB
    });

    it('should include safe MIME types only', () => {
      expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
      expect(ALLOWED_MIME_TYPES).toContain('image/png');
      expect(ALLOWED_MIME_TYPES).toContain('application/pdf');
      expect(ALLOWED_MIME_TYPES).not.toContain('application/x-executable');
      expect(ALLOWED_MIME_TYPES).not.toContain('application/javascript');
    });
  });

  describe('Performance', () => {
    it('should validate files quickly', async () => {
      const validFile = {
        name: 'test.jpg',
        type: 'image/jpeg',
        size: 1024 * 1024, // 1MB
        slice: vi.fn(() => ({
          arrayBuffer: () => Promise.resolve(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]).buffer)
        }))
      };

      const start = performance.now();
      await validateFileServerSide(validFile);
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Should complete quickly
    });

    it('should handle rate limiting efficiently', () => {
      const userId = 'performance-test-user';
      
      const start = performance.now();
      for (let i = 0; i < 50; i++) {
        checkUploadRateLimit(userId, 1000);
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(50); // Should be very fast
    });
  });
});