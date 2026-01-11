import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateReceiptFilename, sanitizeFilename, validatePattern } from '../../src/utils/filename';
import { getSetting } from '../../src/services/dbService';

// Mock dbService
vi.mock('../../src/services/dbService', () => ({
  getSetting: vi.fn(),
}));

describe('filename utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSetting).mockReturnValue(null);
  });

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
        '.pdf',
        123
      );
      expect(filename).toBe('2024-01-15_john-doe_test-clinic_100-50_doctor-visit_0[123-0].pdf');
    });

    it('should format amount with 2 decimal places', () => {
      const filename = generateReceiptFilename(
        '2024-01-15',
        'John',
        'Clinic',
        99.9,
        'visit',
        0,
        '.pdf',
        123
      );
      expect(filename).toContain('99-90');
      expect(filename).toContain('[123-0].pdf');
    });

    it('should handle extension without leading dot', () => {
      const filename = generateReceiptFilename(
        '2024-01-15',
        'John',
        'Clinic',
        100,
        'visit',
        0,
        'pdf',
        123
      );
      expect(filename).toContain('.pdf');
      expect(filename).toContain('[123-0].pdf');
    });

    it('should sanitize user, vendor, and type', () => {
      const filename = generateReceiptFilename(
        '2024-01-15',
        'John Doe & Co.',
        'Test@Clinic#123',
        100,
        'doctor visit',
        0,
        '.pdf',
        123
      );
      expect(filename).toContain('john-doe-co');
      expect(filename).toContain('testclinic123');
      expect(filename).toContain('doctor-visit');
      expect(filename).toContain('[123-0].pdf');
    });

    it('should include file order index', () => {
      const filename1 = generateReceiptFilename(
        '2024-01-15',
        'John',
        'Clinic',
        100,
        'visit',
        0,
        '.pdf',
        123
      );
      const filename2 = generateReceiptFilename(
        '2024-01-15',
        'John',
        'Clinic',
        100,
        'visit',
        1,
        '.pdf',
        123
      );
      expect(filename1).toContain('[123-0].pdf');
      expect(filename2).toContain('[123-1].pdf');
    });

    it('should handle empty strings with defaults', () => {
      const filename = generateReceiptFilename(
        '2024-01-15',
        '',
        '',
        0,
        '',
        0,
        '.pdf',
        123
      );
      expect(filename).toContain('unknown');
      expect(filename).toContain('[123-0].pdf');
    });

    it('should use custom pattern when provided', () => {
      const filename = generateReceiptFilename(
        '2024-01-15',
        'John Doe',
        'Test Clinic',
        100.50,
        'doctor-visit',
        0,
        '.pdf',
        123,
        undefined,
        '{date}-{user}-{vendor}'
      );
      expect(filename).toBe('2024-01-15-john-doe-test-clinic[123-0].pdf');
    });

    it('should read pattern from settings when not provided', () => {
      vi.mocked(getSetting).mockReturnValue(JSON.stringify('{user}_{date}'));
      const filename = generateReceiptFilename(
        '2024-01-15',
        'John Doe',
        'Test Clinic',
        100.50,
        'doctor-visit',
        0,
        '.pdf',
        123
      );
      expect(filename).toBe('john-doe_2024-01-15[123-0].pdf');
    });

    it('should include flags in filename when provided', () => {
      const flags = [
        { id: 1, name: 'Reimbursed', color: '#3b82f6', created_at: '2024-01-01' },
        { id: 2, name: 'Tax Deductible', color: '#10b981', created_at: '2024-01-01' },
      ];
      const filename = generateReceiptFilename(
        '2024-01-15',
        'John Doe',
        'Test Clinic',
        100.50,
        'doctor-visit',
        0,
        '.pdf',
        123,
        flags,
        '{date}_{user}_{flags}_{index}'
      );
      expect(filename).toBe('2024-01-15_john-doe_reimbursed-tax-deductible_0[123-0].pdf');
    });

    it('should handle flags with special characters', () => {
      const flags = [
        { id: 1, name: 'Tax & Deductible!', color: '#10b981', created_at: '2024-01-01' },
      ];
      const filename = generateReceiptFilename(
        '2024-01-15',
        'John Doe',
        'Test Clinic',
        100.50,
        'doctor-visit',
        0,
        '.pdf',
        123,
        flags,
        '{date}_{flags}'
      );
      expect(filename).toContain('tax-deductible');
      expect(filename).toContain('[123-0].pdf');
    });

    it('should handle all tokens in custom pattern', () => {
      const flags = [{ id: 1, name: 'Flag1', color: '#3b82f6', created_at: '2024-01-01' }];
      const filename = generateReceiptFilename(
        '2024-01-15T10:30:00Z',
        'John Doe',
        'Test Clinic',
        100.50,
        'doctor-visit',
        2,
        '.pdf',
        123,
        flags,
        '{date}_{user}_{vendor}_{amount}_{type}_{flags}_{index}'
      );
      expect(filename).toBe('2024-01-15_john-doe_test-clinic_100-50_doctor-visit_flag1_2[123-2].pdf');
    });
  });

  describe('validatePattern', () => {
    it('should validate correct pattern', () => {
      const result = validatePattern('{date}_{user}_{vendor}');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty pattern', () => {
      const result = validatePattern('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject pattern with invalid filesystem characters', () => {
      const invalidChars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
      for (const char of invalidChars) {
        const result = validatePattern(`{date}${char}{user}`);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('invalid filesystem characters');
      }
    });

    it('should reject pattern containing {ext} token', () => {
      const result = validatePattern('{date}_{ext}');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot contain {ext} token');
    });

    it('should reject pattern with unknown tokens', () => {
      const result = validatePattern('{date}_{unknown}');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown token');
      expect(result.error).toContain('{unknown}');
    });

    it('should accept all valid tokens', () => {
      const validPattern = '{date}_{user}_{vendor}_{amount}_{type}_{index}_{flags}';
      const result = validatePattern(validPattern);
      expect(result.valid).toBe(true);
    });

    it('should reject pattern that is too long', () => {
      const longPattern = '{date}'.repeat(50); // Much longer than 200 chars
      const result = validatePattern(longPattern);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should reject pattern starting with dot', () => {
      const result = validatePattern('.{date}_{user}');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot start or end with a dot');
    });

    it('should check for reserved Windows names', () => {
      const reservedNames = ['CON', 'PRN', 'AUX', 'NUL'];
      for (const name of reservedNames) {
        const result = validatePattern(`{date}_${name}_{user}`);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('reserved name');
        expect(result.error).toContain(name);
      }
    });

  });
});

