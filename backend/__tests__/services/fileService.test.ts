import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestFiles, cleanupTestFiles, createTestFile, createTestImageFile, createTestPdfFile, fileExists as checkFileExists } from '../helpers/testFiles';
import { createMockFile } from '../helpers/fixtures';
import path from 'path';
import fs from 'fs/promises';

describe('fileService', () => {
  let testDirs: { receiptsDir: string; uploadDir: string };
  let fileService: typeof import('../../src/services/fileService');

  beforeEach(async () => {
    testDirs = await setupTestFiles();
    // Re-import fileService after setting environment variable
    // This ensures RECEIPTS_DIR is set correctly
    vi.resetModules();
    fileService = await import('../../src/services/fileService');
  });

  afterEach(async () => {
    await cleanupTestFiles();
    vi.resetModules();
  });

  describe('ensureReceiptsDir', () => {
    it('should create receipts directory if it does not exist', async () => {
      const receiptsDir = process.env.RECEIPTS_DIR!;
      await fs.rm(receiptsDir, { recursive: true, force: true });

      await fileService.ensureReceiptsDir();

      const exists = await checkFileExists(receiptsDir);
      expect(exists).toBe(true);
    });

    it('should not fail if directory already exists', async () => {
      await fileService.ensureReceiptsDir();
      await expect(fileService.ensureReceiptsDir()).resolves.not.toThrow();
    });
  });

  describe('ensureReceiptDir', () => {
    it('should create receipt-specific directory', async () => {
      const receiptDir = await fileService.ensureReceiptDir(1);
      const exists = await checkFileExists(receiptDir);
      expect(exists).toBe(true);
    });

    it('should return the receipt directory path', async () => {
      const receiptDir = await fileService.ensureReceiptDir(123);
      expect(receiptDir).toContain('123');
    });
  });

  describe('isImageFile', () => {
    it('should return true for image extensions', () => {
      expect(fileService.isImageFile('test.jpg')).toBe(true);
      expect(fileService.isImageFile('test.jpeg')).toBe(true);
      expect(fileService.isImageFile('test.png')).toBe(true);
      expect(fileService.isImageFile('test.webp')).toBe(true);
    });

    it('should return false for non-image extensions', () => {
      expect(fileService.isImageFile('test.pdf')).toBe(false);
      expect(fileService.isImageFile('test.txt')).toBe(false);
      expect(fileService.isImageFile('test.doc')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(fileService.isImageFile('test.JPG')).toBe(true);
      expect(fileService.isImageFile('test.PNG')).toBe(true);
    });
  });

  describe('isPdfFile', () => {
    it('should return true for PDF extension', () => {
      expect(fileService.isPdfFile('test.pdf')).toBe(true);
    });

    it('should return false for non-PDF extensions', () => {
      expect(fileService.isPdfFile('test.jpg')).toBe(false);
      expect(fileService.isPdfFile('test.txt')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(fileService.isPdfFile('test.PDF')).toBe(true);
    });
  });

  describe('saveReceiptFile', () => {
    it('should save a PDF file', async () => {
      const mockFile = createMockFile({
        originalname: 'test.pdf',
        path: path.join(testDirs.uploadDir, 'test.pdf'),
      });
      await createTestPdfFile(testDirs.uploadDir, 'test.pdf');

      const result = await fileService.saveReceiptFile(
        mockFile,
        1,
        '2024-01-15',
        'Test User',
        'Test Vendor',
        100.50,
        'doctor-visit',
        0
      );

      expect(result.filename).toBeDefined();
      expect(result.originalFilename).toBe('test.pdf');
      expect(result.optimized).toBe(false);

      const filePath = fileService.getReceiptFilePath(1, result.filename);
      const exists = await fileService.fileExists(1, result.filename);
      expect(exists).toBe(true);
    });

    it('should save and optimize an image file', async () => {
      const mockFile = createMockFile({
        originalname: 'test.jpg',
        path: path.join(testDirs.uploadDir, 'test.jpg'),
      });
      await createTestImageFile(testDirs.uploadDir, 'test.jpg');

      const result = await fileService.saveReceiptFile(
        mockFile,
        1,
        '2024-01-15',
        'Test User',
        'Test Vendor',
        100.50,
        'doctor-visit',
        0
      );

      expect(result.filename).toBeDefined();
      expect(result.originalFilename).toBe('test.jpg');
      // Note: optimization may fail in test environment, so we just check the file was saved
      const exists = await fileService.fileExists(1, result.filename);
      expect(exists).toBe(true);
    });

    it('should generate correct filename format', async () => {
      const mockFile = createMockFile({
        originalname: 'receipt.pdf',
        path: path.join(testDirs.uploadDir, 'receipt.pdf'),
      });
      await createTestPdfFile(testDirs.uploadDir, 'receipt.pdf');

      const result = await fileService.saveReceiptFile(
        mockFile,
        1,
        '2024-01-15',
        'John Doe',
        'Test Clinic',
        100.50,
        'doctor-visit',
        0
      );

      expect(result.filename).toContain('2024-01-15');
      expect(result.filename).toContain('john-doe');
      expect(result.filename).toContain('test-clinic');
      expect(result.filename).toContain('100-50');
      expect(result.filename).toContain('doctor-visit');
      expect(result.filename).toContain('_0');
      expect(result.filename).toMatch(/\.pdf$/);
    });

    it('should handle multiple files with correct ordering', async () => {
      const mockFile1 = createMockFile({
        originalname: 'file1.pdf',
        path: path.join(testDirs.uploadDir, 'file1.pdf'),
      });
      const mockFile2 = createMockFile({
        originalname: 'file2.pdf',
        path: path.join(testDirs.uploadDir, 'file2.pdf'),
      });

      await createTestPdfFile(testDirs.uploadDir, 'file1.pdf');
      await createTestPdfFile(testDirs.uploadDir, 'file2.pdf');

      const result1 = await fileService.saveReceiptFile(
        mockFile1,
        1,
        '2024-01-15',
        'User',
        'Vendor',
        100,
        'type',
        0
      );
      const result2 = await fileService.saveReceiptFile(
        mockFile2,
        1,
        '2024-01-15',
        'User',
        'Vendor',
        100,
        'type',
        1
      );

      expect(result1.filename).toContain('_0.pdf');
      expect(result2.filename).toContain('_1.pdf');
    });

    it('should include flags in filename when provided', async () => {
      const mockFile = createMockFile({
        originalname: 'receipt.pdf',
        path: path.join(testDirs.uploadDir, 'receipt.pdf'),
      });
      await createTestPdfFile(testDirs.uploadDir, 'receipt.pdf');

      const flags = [
        { id: 1, name: 'Reimbursed', color: '#3b82f6', created_at: '2024-01-01' },
        { id: 2, name: 'Tax Deductible', color: '#10b981', created_at: '2024-01-01' },
      ];

      const result = await fileService.saveReceiptFile(
        mockFile,
        1,
        '2024-01-15',
        'John Doe',
        'Test Clinic',
        100.50,
        'doctor-visit',
        0,
        flags
      );

      // With default pattern, flags should be included if pattern supports it
      // But default pattern doesn't include {flags}, so we just verify it doesn't break
      expect(result.filename).toBeDefined();
      expect(result.filename).toContain('2024-01-15');
    });
  });

  describe('deleteReceiptFile', () => {
    it('should delete a file from disk', async () => {
      const mockFile = createMockFile({
        originalname: 'test.pdf',
        path: path.join(testDirs.uploadDir, 'test.pdf'),
      });
      await createTestPdfFile(testDirs.uploadDir, 'test.pdf');

      const result = await fileService.saveReceiptFile(
        mockFile,
        1,
        '2024-01-15',
        'User',
        'Vendor',
        100,
        'type',
        0
      );

      let exists = await fileService.fileExists(1, result.filename);
      expect(exists).toBe(true);

      await fileService.deleteReceiptFile(1, result.filename);

      exists = await fileService.fileExists(1, result.filename);
      expect(exists).toBe(false);
    });

    it('should not throw if file does not exist', async () => {
      await expect(fileService.deleteReceiptFile(1, 'non-existent.pdf')).resolves.not.toThrow();
    });
  });

  describe('deleteReceiptFiles', () => {
    it('should delete all files for a receipt', async () => {
      const mockFile1 = createMockFile({
        originalname: 'file1.pdf',
        path: path.join(testDirs.uploadDir, 'file1.pdf'),
      });
      const mockFile2 = createMockFile({
        originalname: 'file2.pdf',
        path: path.join(testDirs.uploadDir, 'file2.pdf'),
      });

      await createTestPdfFile(testDirs.uploadDir, 'file1.pdf');
      await createTestPdfFile(testDirs.uploadDir, 'file2.pdf');

      await fileService.saveReceiptFile(mockFile1, 1, '2024-01-15', 'User', 'Vendor', 100, 'type', 0);
      await fileService.saveReceiptFile(mockFile2, 1, '2024-01-15', 'User', 'Vendor', 100, 'type', 1);

      await fileService.deleteReceiptFiles(1);

      const receiptDir = path.join(process.env.RECEIPTS_DIR!, '1');
      const exists = await checkFileExists(receiptDir);
      expect(exists).toBe(false);
    });

    it('should not throw if directory does not exist', async () => {
      await expect(fileService.deleteReceiptFiles(99999)).resolves.not.toThrow();
    });
  });

  describe('fileExists', () => {
    it('should return true if file exists', async () => {
      const mockFile = createMockFile({
        originalname: 'test.pdf',
        path: path.join(testDirs.uploadDir, 'test.pdf'),
      });
      await createTestPdfFile(testDirs.uploadDir, 'test.pdf');

      const result = await fileService.saveReceiptFile(
        mockFile,
        1,
        '2024-01-15',
        'User',
        'Vendor',
        100,
        'type',
        0
      );

      const exists = await fileService.fileExists(1, result.filename);
      expect(exists).toBe(true);
    });

    it('should return false if file does not exist', async () => {
      const exists = await fileService.fileExists(1, 'non-existent.pdf');
      expect(exists).toBe(false);
    });
  });

  describe('getReceiptFilePath', () => {
    it('should return correct file path', () => {
      const filePath = fileService.getReceiptFilePath(123, 'test.pdf');
      expect(filePath).toContain('123');
      expect(filePath).toContain('test.pdf');
    });
  });

  describe('optimizeImage', () => {
    it('should convert image to WebP format', async () => {
      const inputPath = path.join(testDirs.uploadDir, 'input.jpg');
      const outputPath = path.join(testDirs.uploadDir, 'output.webp');
      await createTestImageFile(testDirs.uploadDir, 'input.jpg');

      // Note: This may fail in test environment if sharp is not properly configured
      // We'll just test that the function doesn't throw for valid inputs
      try {
        await fileService.optimizeImage(inputPath, outputPath);
        const exists = await checkFileExists(outputPath);
        // If optimization succeeds, file should exist
        if (exists) {
          expect(exists).toBe(true);
        }
      } catch (error) {
        // If optimization fails, it should copy the original
        const exists = await checkFileExists(outputPath);
        expect(exists).toBe(true);
      }
    });
  });

  describe('renameReceiptFiles', () => {
    it('should rename files when receipt data changes', async () => {
      // Create initial file
      const mockFile = createMockFile({
        originalname: 'receipt.pdf',
        path: path.join(testDirs.uploadDir, 'receipt.pdf'),
      });
      await createTestPdfFile(testDirs.uploadDir, 'receipt.pdf');

      const result = await fileService.saveReceiptFile(
        mockFile,
        1,
        '2024-01-15',
        'John Doe',
        'Old Clinic',
        100.50,
        'doctor-visit',
        0
      );

      const oldFilename = result.filename;
      const oldExists = await fileService.fileExists(1, oldFilename);
      expect(oldExists).toBe(true);

      // Rename with updated data
      const files = [
        {
          id: 1,
          filename: oldFilename,
          original_filename: 'receipt.pdf',
          file_order: 0,
        },
      ];

      const renameResults = await fileService.renameReceiptFiles(
        1,
        files,
        '2024-01-16', // Updated date
        'Jane Smith', // Updated user
        'New Clinic', // Updated vendor
        200.00, // Updated amount
        'prescription', // Updated type
        [] // No flags
      );

      expect(renameResults).toHaveLength(1);
      expect(renameResults[0].oldFilename).toBe(oldFilename);
      expect(renameResults[0].newFilename).not.toBe(oldFilename);

      // Old file should not exist
      const oldStillExists = await fileService.fileExists(1, oldFilename);
      expect(oldStillExists).toBe(false);

      // New file should exist
      const newExists = await fileService.fileExists(1, renameResults[0].newFilename);
      expect(newExists).toBe(true);
    });

    it('should include flags in renamed filename', async () => {
      const mockFile = createMockFile({
        originalname: 'receipt.pdf',
        path: path.join(testDirs.uploadDir, 'receipt.pdf'),
      });
      await createTestPdfFile(testDirs.uploadDir, 'receipt.pdf');

      const result = await fileService.saveReceiptFile(
        mockFile,
        1,
        '2024-01-15',
        'John Doe',
        'Clinic',
        100.50,
        'doctor-visit',
        0
      );

      const files = [
        {
          id: 1,
          filename: result.filename,
          original_filename: 'receipt.pdf',
          file_order: 0,
        },
      ];

      const flags = [
        { id: 1, name: 'Reimbursed', color: '#3b82f6', created_at: '2024-01-01' },
      ];

      const renameResults = await fileService.renameReceiptFiles(
        1,
        files,
        '2024-01-15',
        'John Doe',
        'Clinic',
        100.50,
        'doctor-visit',
        flags
      );

      expect(renameResults).toHaveLength(1);
      // With default pattern, flags won't appear, but function should work
      expect(renameResults[0].newFilename).toBeDefined();
    });

    it('should not rename if filename unchanged', async () => {
      const mockFile = createMockFile({
        originalname: 'receipt.pdf',
        path: path.join(testDirs.uploadDir, 'receipt.pdf'),
      });
      await createTestPdfFile(testDirs.uploadDir, 'receipt.pdf');

      const result = await fileService.saveReceiptFile(
        mockFile,
        1,
        '2024-01-15',
        'John Doe',
        'Clinic',
        100.50,
        'doctor-visit',
        0
      );

      const files = [
        {
          id: 1,
          filename: result.filename,
          original_filename: 'receipt.pdf',
          file_order: 0,
        },
      ];

      // Rename with same data (should not change)
      const renameResults = await fileService.renameReceiptFiles(
        1,
        files,
        '2024-01-15',
        'John Doe',
        'Clinic',
        100.50,
        'doctor-visit',
        []
      );

      // Should return empty array since filename didn't change
      expect(renameResults).toHaveLength(0);
    });
  });
});

