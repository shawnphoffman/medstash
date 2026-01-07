import { describe, it, expect } from 'vitest';
import { generateReceiptFilename, sanitizeFilename } from '../../src/utils/filename';

describe('filename utils', () => {
  describe('sanitizeFilename', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeFilename('TEST')).toBe('test');
    });

    it('should replace spaces with hyphens', () => {
      expect(sanitizeFilename('test file name')).toBe('test-file-name');
    });

    it('should remove special characters', () => {
      expect(sanitizeFilename('test@file#name!')).toBe('testfilename');
    });

    it('should keep alphanumeric, hyphens, and underscores', () => {
      expect(sanitizeFilename('test_file-name123')).toBe('test_file-name123');
    });

    it('should collapse multiple hyphens', () => {
      expect(sanitizeFilename('test---file')).toBe('test-file');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(sanitizeFilename('-test-file-')).toBe('test-file');
    });

    it('should limit length to 50 characters', () => {
      const longString = 'a'.repeat(100);
      expect(sanitizeFilename(longString).length).toBe(50);
    });

    it('should return "unknown" for empty or whitespace-only strings', () => {
      expect(sanitizeFilename('')).toBe('unknown');
      expect(sanitizeFilename('   ')).toBe('unknown');
    });

    it('should handle null/undefined-like inputs', () => {
      expect(sanitizeFilename('')).toBe('unknown');
    });
  });

  describe('generateReceiptFilename', () => {
    it('should generate correct filename format', () => {
      const filename = generateReceiptFilename(
        '2024-01-15',
        'John Doe',
        'Test Clinic',
        100.50,
        'doctor-visit',
        0,
        '.pdf'
      );
      expect(filename).toBe('2024-01-15_john-doe_test-clinic_100-50_doctor-visit_0.pdf');
    });

    it('should handle date with time component', () => {
      const filename = generateReceiptFilename(
        '2024-01-15T10:30:00Z',
        'John Doe',
        'Test Clinic',
        100.50,
        'doctor-visit',
        0,
        '.pdf'
      );
      expect(filename).toContain('2024-01-15_');
    });

    it('should format amount with 2 decimal places', () => {
      const filename = generateReceiptFilename(
        '2024-01-15',
        'John',
        'Clinic',
        99.9,
        'visit',
        0,
        '.pdf'
      );
      expect(filename).toContain('99-90');
    });

    it('should replace decimal point with dash in amount', () => {
      const filename = generateReceiptFilename(
        '2024-01-15',
        'John',
        'Clinic',
        100.50,
        'visit',
        0,
        '.pdf'
      );
      expect(filename).toContain('100-50');
    });

    it('should handle extension without leading dot', () => {
      const filename = generateReceiptFilename(
        '2024-01-15',
        'John',
        'Clinic',
        100,
        'visit',
        0,
        'pdf'
      );
      expect(filename).toContain('.pdf');
    });

    it('should sanitize user, vendor, and type', () => {
      const filename = generateReceiptFilename(
        '2024-01-15',
        'John Doe & Co.',
        'Test@Clinic#123',
        100,
        'doctor visit',
        0,
        '.pdf'
      );
      expect(filename).toContain('john-doe-co');
      expect(filename).toContain('testclinic123');
      expect(filename).toContain('doctor-visit');
    });

    it('should include file order index', () => {
      const filename1 = generateReceiptFilename(
        '2024-01-15',
        'John',
        'Clinic',
        100,
        'visit',
        0,
        '.pdf'
      );
      const filename2 = generateReceiptFilename(
        '2024-01-15',
        'John',
        'Clinic',
        100,
        'visit',
        1,
        '.pdf'
      );
      expect(filename1).toContain('_0.pdf');
      expect(filename2).toContain('_1.pdf');
    });

    it('should handle zero amount', () => {
      const filename = generateReceiptFilename(
        '2024-01-15',
        'John',
        'Clinic',
        0,
        'visit',
        0,
        '.pdf'
      );
      expect(filename).toContain('0-00');
    });

    it('should handle empty strings with defaults', () => {
      const filename = generateReceiptFilename(
        '2024-01-15',
        '',
        '',
        0,
        '',
        0,
        '.pdf'
      );
      expect(filename).toContain('unknown');
    });
  });
});

