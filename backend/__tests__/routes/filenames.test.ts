import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/testServer';
import { setupTestDb, createTestDbQueries } from '../helpers/testDb';
import { setupTestFiles, cleanupTestFiles, createTestPdfFile } from '../helpers/testFiles';
import path from 'path';
import fs from 'fs/promises';

// Mock the db module using factory function
vi.mock('../../src/db', async () => {
  const { setupTestDb, createTestDbQueries } = await import('../helpers/testDb');
  const testDb = setupTestDb();
  const testQueries = createTestDbQueries(testDb);
  return {
    dbQueries: testQueries,
    db: testDb,
    default: testDb,
  };
});

describe('Filenames API', () => {
  const app = createTestApp();
  let dbQueries: ReturnType<typeof createTestDbQueries>;
  let testDirs: { receiptsDir: string; uploadDir: string };

  beforeEach(async () => {
    // Clear the mocked database
    const dbModule = await import('../../src/db');
    const db = dbModule.db;
    dbQueries = dbModule.dbQueries;
    db.exec(`
      DELETE FROM receipt_flags;
      DELETE FROM receipt_files;
      DELETE FROM receipts;
      DELETE FROM flags;
      DELETE FROM settings;
    `);

    // Setup test files
    testDirs = await setupTestFiles();
  });

  afterEach(async () => {
    await cleanupTestFiles();
  });

  describe('POST /api/filenames/rename-all', () => {
    it('should rename all files when pattern is set', async () => {
      // Create a flag
      const flagResult = dbQueries.insertFlag.run('Reimbursed', '#3b82f6');
      const flagId = flagResult.lastInsertRowid as number;

      // Create a receipt with flag
      const receiptResult = dbQueries.insertReceipt.run(
        'John Doe',
        'doctor-visit',
        100.50,
        'Test Clinic',
        '123 Main St',
        'Test description',
        '2024-01-15',
        null
      );
      const receiptId = receiptResult.lastInsertRowid as number;
      dbQueries.insertReceiptFlag.run(receiptId, flagId);

      // Create receipt directory and file with old pattern
      const receiptDir = path.join(testDirs.receiptsDir, receiptId.toString());
      await fs.mkdir(receiptDir, { recursive: true });
      const oldFilename = '2024-01-15_john-doe_test-clinic_100-50_doctor-visit_0.pdf';
      const oldFilePath = path.join(receiptDir, oldFilename);
      await createTestPdfFile(receiptDir, oldFilename);

      // Insert file record
      dbQueries.insertReceiptFile.run(receiptId, oldFilename, 'original.pdf', 0);

      // Set a new pattern
      dbQueries.setSetting.run('filenamePattern', JSON.stringify('{date}_{user}_{flags}_{index}'));

      // Call rename endpoint
      const response = await request(app).post('/api/filenames/rename-all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.totalReceipts).toBe(1);
      expect(response.body.totalFiles).toBe(1);
      expect(response.body.renamed).toBe(1);
      expect(response.body.errors).toHaveLength(0);

      // Verify file was renamed
      const newFilename = '2024-01-15_john-doe_reimbursed_0.pdf';
      const newFilePath = path.join(receiptDir, newFilename);
      const newFileExists = await fs.access(newFilePath).then(() => true).catch(() => false);
      expect(newFileExists).toBe(true);

      // Verify old file doesn't exist
      const oldFileExists = await fs.access(oldFilePath).then(() => true).catch(() => false);
      expect(oldFileExists).toBe(false);

      // Verify database was updated
      const files = dbQueries.getFilesByReceiptId.all(receiptId);
      expect(files).toHaveLength(1);
      expect((files[0] as any).filename).toBe(newFilename);
    });

    it('should handle multiple receipts and files', async () => {
      // Create two receipts
      const receipt1Result = dbQueries.insertReceipt.run(
        'John Doe',
        'doctor-visit',
        100.50,
        'Clinic A',
        '123 Main St',
        'Description',
        '2024-01-15',
        null
      );
      const receipt1Id = receipt1Result.lastInsertRowid as number;

      const receipt2Result = dbQueries.insertReceipt.run(
        'Jane Smith',
        'prescription',
        50.00,
        'Pharmacy B',
        '456 Oak St',
        'Description',
        '2024-01-16',
        null
      );
      const receipt2Id = receipt2Result.lastInsertRowid as number;

      // Create files for both receipts
      const receipt1Dir = path.join(testDirs.receiptsDir, receipt1Id.toString());
      const receipt2Dir = path.join(testDirs.receiptsDir, receipt2Id.toString());
      await fs.mkdir(receipt1Dir, { recursive: true });
      await fs.mkdir(receipt2Dir, { recursive: true });

      const file1 = '2024-01-15_john-doe_clinic-a_100-50_doctor-visit_0.pdf';
      const file2 = '2024-01-15_john-doe_clinic-a_100-50_doctor-visit_1.pdf';
      const file3 = '2024-01-16_jane-smith_pharmacy-b_50-00_prescription_0.pdf';

      await createTestPdfFile(receipt1Dir, file1);
      await createTestPdfFile(receipt1Dir, file2);
      await createTestPdfFile(receipt2Dir, file3);

      dbQueries.insertReceiptFile.run(receipt1Id, file1, 'original1.pdf', 0);
      dbQueries.insertReceiptFile.run(receipt1Id, file2, 'original2.pdf', 1);
      dbQueries.insertReceiptFile.run(receipt2Id, file3, 'original3.pdf', 0);

      // Set new pattern
      dbQueries.setSetting.run('filenamePattern', JSON.stringify('{user}_{date}_{index}'));

      const response = await request(app).post('/api/filenames/rename-all');

      expect(response.status).toBe(200);
      expect(response.body.totalReceipts).toBe(2);
      expect(response.body.totalFiles).toBe(3);
      expect(response.body.renamed).toBe(3);
    });

    it('should handle receipts with flags', async () => {
      // Create flags
      const flag1Result = dbQueries.insertFlag.run('Reimbursed', '#3b82f6');
      const flag2Result = dbQueries.insertFlag.run('Tax Deductible', '#10b981');
      const flag1Id = flag1Result.lastInsertRowid as number;
      const flag2Id = flag2Result.lastInsertRowid as number;

      // Create receipt with flags
      const receiptResult = dbQueries.insertReceipt.run(
        'John Doe',
        'doctor-visit',
        100.50,
        'Clinic',
        'Address',
        'Description',
        '2024-01-15',
        null
      );
      const receiptId = receiptResult.lastInsertRowid as number;
      dbQueries.insertReceiptFlag.run(receiptId, flag1Id);
      dbQueries.insertReceiptFlag.run(receiptId, flag2Id);

      // Create file
      const receiptDir = path.join(testDirs.receiptsDir, receiptId.toString());
      await fs.mkdir(receiptDir, { recursive: true });
      const oldFilename = '2024-01-15_john-doe_clinic_100-50_doctor-visit_0.pdf';
      await createTestPdfFile(receiptDir, oldFilename);
      dbQueries.insertReceiptFile.run(receiptId, oldFilename, 'original.pdf', 0);

      // Set pattern with flags
      dbQueries.setSetting.run('filenamePattern', JSON.stringify('{date}_{flags}_{index}'));

      const response = await request(app).post('/api/filenames/rename-all');

      expect(response.status).toBe(200);
      expect(response.body.renamed).toBe(1);

      // Verify filename includes flags
      const files = dbQueries.getFilesByReceiptId.all(receiptId);
      const newFilename = (files[0] as any).filename;
      expect(newFilename).toContain('reimbursed');
      expect(newFilename).toContain('tax-deductible');
    });

    it('should handle receipts without flags', async () => {
      const receiptResult = dbQueries.insertReceipt.run(
        'John Doe',
        'doctor-visit',
        100.50,
        'Clinic',
        'Address',
        'Description',
        '2024-01-15',
        null
      );
      const receiptId = receiptResult.lastInsertRowid as number;

      const receiptDir = path.join(testDirs.receiptsDir, receiptId.toString());
      await fs.mkdir(receiptDir, { recursive: true });
      const oldFilename = '2024-01-15_john-doe_clinic_100-50_doctor-visit_0.pdf';
      await createTestPdfFile(receiptDir, oldFilename);
      dbQueries.insertReceiptFile.run(receiptId, oldFilename, 'original.pdf', 0);

      // Set pattern with flags token (should result in empty string for flags)
      dbQueries.setSetting.run('filenamePattern', JSON.stringify('{date}_{flags}_{index}'));

      const response = await request(app).post('/api/filenames/rename-all');

      expect(response.status).toBe(200);
      expect(response.body.renamed).toBe(1);

      // Verify filename doesn't have extra separators from empty flags
      const files = dbQueries.getFilesByReceiptId.all(receiptId);
      const newFilename = (files[0] as any).filename;
      expect(newFilename).not.toContain('__'); // No double separators
    });

    it('should handle receipts with no files', async () => {
      const receiptResult = dbQueries.insertReceipt.run(
        'John Doe',
        'doctor-visit',
        100.50,
        'Clinic',
        'Address',
        'Description',
        '2024-01-15',
        null
      );
      const receiptId = receiptResult.lastInsertRowid as number;

      const response = await request(app).post('/api/filenames/rename-all');

      expect(response.status).toBe(200);
      expect(response.body.totalReceipts).toBe(1);
      expect(response.body.totalFiles).toBe(0);
      expect(response.body.renamed).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      // Create receipt with file that doesn't exist on disk
      const receiptResult = dbQueries.insertReceipt.run(
        'John Doe',
        'doctor-visit',
        100.50,
        'Clinic',
        'Address',
        'Description',
        '2024-01-15',
        null
      );
      const receiptId = receiptResult.lastInsertRowid as number;

      // Insert file record but don't create actual file
      dbQueries.insertReceiptFile.run(receiptId, 'missing-file.pdf', 'original.pdf', 0);

      const response = await request(app).post('/api/filenames/rename-all');

      expect(response.status).toBe(200);
      expect(response.body.totalReceipts).toBe(1);
      expect(response.body.totalFiles).toBe(1);
      // File doesn't exist, so it won't be renamed but shouldn't cause an error
      expect(response.body.renamed).toBe(0);
    });

    it('should use default pattern when no pattern is set', async () => {
      const receiptResult = dbQueries.insertReceipt.run(
        'John Doe',
        'doctor-visit',
        100.50,
        'Test Clinic',
        'Address',
        'Description',
        '2024-01-15',
        null
      );
      const receiptId = receiptResult.lastInsertRowid as number;

      const receiptDir = path.join(testDirs.receiptsDir, receiptId.toString());
      await fs.mkdir(receiptDir, { recursive: true });
      const oldFilename = '2024-01-15_john-doe_test-clinic_100-50_doctor-visit_0.pdf';
      await createTestPdfFile(receiptDir, oldFilename);
      dbQueries.insertReceiptFile.run(receiptId, oldFilename, 'original.pdf', 0);

      // Don't set pattern - should use default
      const response = await request(app).post('/api/filenames/rename-all');

      expect(response.status).toBe(200);
      // Since pattern matches default, filename shouldn't change
      // But the rename operation should still complete successfully
      expect(response.body.renamed).toBe(0); // No change needed
    });
  });
});


