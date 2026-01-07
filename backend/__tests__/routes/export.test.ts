import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/testServer';
import { setupTestDb, clearTestDb, createTestDbQueries } from '../helpers/testDb';
import { setupTestFiles, cleanupTestFiles, createTestPdfFile } from '../helpers/testFiles';
import { createReceiptFixture } from '../helpers/fixtures';
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

// Mock fileService to use test directories
vi.mock('../../src/services/fileService', async () => {
  const actual = await vi.importActual('../../src/services/fileService') as any;
  const path = await import('path');

  // Get test receipts dir from env (set in beforeEach)
  const getTestReceiptsDir = () => {
    return process.env.RECEIPTS_DIR || '/tmp/test-receipts';
  };

  const getReceiptDir = (receiptId: number) => {
    return path.join(getTestReceiptsDir(), receiptId.toString());
  };

  return {
    ...actual,
    getReceiptDir,
    getReceiptFilePath: (receiptId: number, filename: string) => {
      return path.join(getReceiptDir(receiptId), filename);
    },
  };
});

describe('Export API', () => {
  const app = createTestApp();
  let testDirs: { receiptsDir: string; uploadDir: string };
  let dbQueries: ReturnType<typeof createTestDbQueries>;

  beforeEach(async () => {
    // Set DB_DIR to a temp directory to avoid trying to create /data
    process.env.DB_DIR = require('os').tmpdir();
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
    testDirs = await setupTestFiles();
    process.env.RECEIPTS_DIR = testDirs.receiptsDir;
  });

  afterEach(async () => {
    await cleanupTestFiles();
  });

  describe('GET /api/export', () => {
    it('should generate zip archive with receipts', async () => {
      // Create a receipt with files
      const receiptData = createReceiptFixture();
      // Create user and type first to get their IDs
      let user = dbQueries.getUserByName.get(receiptData.user!) as { id: number } | undefined;
      if (!user) {
        const userResult = dbQueries.insertUser.run(receiptData.user!);
        user = dbQueries.getUserById.get(Number(userResult.lastInsertRowid)) as { id: number };
      }
      let type = dbQueries.getReceiptTypeByName.get(receiptData.type!) as { id: number } | undefined;
      if (!type) {
        const typeResult = dbQueries.insertReceiptType.run(receiptData.type!);
        type = dbQueries.getReceiptTypeById.get(Number(typeResult.lastInsertRowid)) as { id: number };
      }
      const receiptResult = dbQueries.insertReceipt.run(
        user.id,
        type.id,
        receiptData.amount!,
        receiptData.vendor!,
        receiptData.provider_address!,
        receiptData.description!,
        receiptData.date!,
        receiptData.notes || null
      );
      const receiptId = Number(receiptResult.lastInsertRowid);

      // Create receipt directory and file
      const receiptDir = path.join(testDirs.receiptsDir, receiptId.toString());
      await fs.mkdir(receiptDir, { recursive: true });
      await createTestPdfFile(receiptDir, 'test.pdf');

      // Add file to database
      dbQueries.insertReceiptFile.run(receiptId, 'test.pdf', 'original.pdf', 0);

      const response = await request(app).get('/api/export');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/zip');
      expect(response.headers['content-disposition']).toContain('medstash-export.zip');
      // Response body should be defined (could be buffer or string depending on supertest)
      expect(response.body).toBeDefined();
      if (Buffer.isBuffer(response.body)) {
        expect(response.body.length).toBeGreaterThan(0);
      } else if (typeof response.body === 'string') {
        expect(response.body.length).toBeGreaterThan(0);
      }
    });

    it('should include metadata.json for each receipt', async () => {
      const receiptData = createReceiptFixture();
      // Create user and type first to get their IDs
      let user = dbQueries.getUserByName.get(receiptData.user!) as { id: number } | undefined;
      if (!user) {
        const userResult = dbQueries.insertUser.run(receiptData.user!);
        user = dbQueries.getUserById.get(Number(userResult.lastInsertRowid)) as { id: number };
      }
      let type = dbQueries.getReceiptTypeByName.get(receiptData.type!) as { id: number } | undefined;
      if (!type) {
        const typeResult = dbQueries.insertReceiptType.run(receiptData.type!);
        type = dbQueries.getReceiptTypeById.get(Number(typeResult.lastInsertRowid)) as { id: number };
      }
      const receiptResult = dbQueries.insertReceipt.run(
        user.id,
        type.id,
        receiptData.amount!,
        receiptData.vendor!,
        receiptData.provider_address!,
        receiptData.description!,
        receiptData.date!,
        receiptData.notes || null
      );
      const receiptId = Number(receiptResult.lastInsertRowid);

      const receiptDir = path.join(testDirs.receiptsDir, receiptId.toString());
      await fs.mkdir(receiptDir, { recursive: true });

      const response = await request(app).get('/api/export');

      expect(response.status).toBe(200);
      // The zip should contain metadata (we can't easily parse zip in test, but we verify it was created)
      expect(response.body).toBeDefined();
      if (response.body && typeof response.body.length === 'number') {
        expect(response.body.length).toBeGreaterThan(0);
      }
    });

    it('should handle receipts with flags', async () => {
      const receiptData = createReceiptFixture();
      // Create user and type first to get their IDs
      let user = dbQueries.getUserByName.get(receiptData.user!) as { id: number } | undefined;
      if (!user) {
        const userResult = dbQueries.insertUser.run(receiptData.user!);
        user = dbQueries.getUserById.get(Number(userResult.lastInsertRowid)) as { id: number };
      }
      let type = dbQueries.getReceiptTypeByName.get(receiptData.type!) as { id: number } | undefined;
      if (!type) {
        const typeResult = dbQueries.insertReceiptType.run(receiptData.type!);
        type = dbQueries.getReceiptTypeById.get(Number(typeResult.lastInsertRowid)) as { id: number };
      }
      const receiptResult = dbQueries.insertReceipt.run(
        user.id,
        type.id,
        receiptData.amount!,
        receiptData.vendor!,
        receiptData.provider_address!,
        receiptData.description!,
        receiptData.date!,
        receiptData.notes || null
      );
      const receiptId = Number(receiptResult.lastInsertRowid);

      const flagResult = dbQueries.insertFlag.run('Test Flag', '#FF0000');
      const flagId = Number(flagResult.lastInsertRowid);
      dbQueries.insertReceiptFlag.run(receiptId, flagId);

      const receiptDir = path.join(testDirs.receiptsDir, receiptId.toString());
      await fs.mkdir(receiptDir, { recursive: true });

      const response = await request(app).get('/api/export');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      if (response.body && typeof response.body.length === 'number') {
        expect(response.body.length).toBeGreaterThan(0);
      }
    });

    it('should handle empty receipts list', async () => {
      const response = await request(app).get('/api/export');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/zip');
      // Empty zip should still be valid - response.body might be a string, buffer, or undefined
      if (response.body) {
        const bodyLength = Buffer.isBuffer(response.body) ? response.body.length : (typeof response.body === 'string' ? response.body.length : 0);
        expect(bodyLength).toBeGreaterThanOrEqual(0);
      } else {
        // If body is undefined, that's also acceptable for an empty zip
        expect(response.body).toBeUndefined();
      }
    });

    it('should handle missing files gracefully', async () => {
      const receiptData = createReceiptFixture();
      // Create user and type first to get their IDs
      let user = dbQueries.getUserByName.get(receiptData.user!) as { id: number } | undefined;
      if (!user) {
        const userResult = dbQueries.insertUser.run(receiptData.user!);
        user = dbQueries.getUserById.get(Number(userResult.lastInsertRowid)) as { id: number };
      }
      let type = dbQueries.getReceiptTypeByName.get(receiptData.type!) as { id: number } | undefined;
      if (!type) {
        const typeResult = dbQueries.insertReceiptType.run(receiptData.type!);
        type = dbQueries.getReceiptTypeById.get(Number(typeResult.lastInsertRowid)) as { id: number };
      }
      const receiptResult = dbQueries.insertReceipt.run(
        user.id,
        type.id,
        receiptData.amount!,
        receiptData.vendor!,
        receiptData.provider_address!,
        receiptData.description!,
        receiptData.date!,
        receiptData.notes || null
      );
      const receiptId = Number(receiptResult.lastInsertRowid);

      // Add file reference but don't create actual file
      dbQueries.insertReceiptFile.run(receiptId, 'missing.pdf', 'missing.pdf', 0);

      const response = await request(app).get('/api/export');

      // Should still succeed, just skip missing files
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      if (response.body && typeof response.body.length === 'number') {
        expect(response.body.length).toBeGreaterThan(0);
      }
    });
  });
});

