import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/testServer';
import { setupTestDb, createTestDbQueries } from '../helpers/testDb';
import { createReceiptTypeFixture } from '../helpers/fixtures';

// Mock the db module
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

describe('ReceiptTypes API', () => {
  let app: any;

  beforeEach(async () => {
    app = createTestApp();
    // Clear test database
    const dbModule = await import('../../src/db');
    const db = dbModule.db;
    db.exec(`
      DELETE FROM receipt_flags;
      DELETE FROM receipt_files;
      DELETE FROM receipts;
      DELETE FROM receipt_types;
      DELETE FROM users;
    `);
  });

  describe('GET /api/receipt-types', () => {
    it('should get all receipt types', async () => {
      const { createReceiptType } = await import('../../src/services/dbService');
      createReceiptType('Type 1');
      createReceiptType('Type 2');

      const response = await request(app).get('/api/receipt-types');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.map((t: any) => t.name)).toContain('Type 1');
      expect(response.body.map((t: any) => t.name)).toContain('Type 2');
    });

    it('should return empty array when no receipt types exist', async () => {
      const response = await request(app).get('/api/receipt-types');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/receipt-types/:id', () => {
    it('should get a receipt type by ID', async () => {
      const { createReceiptType } = await import('../../src/services/dbService');
      const type = createReceiptType('Test Type');

      const response = await request(app).get(`/api/receipt-types/${type.id}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(type.id);
      expect(response.body.name).toBe('Test Type');
    });

    it('should return 404 for non-existent receipt type', async () => {
      const response = await request(app).get('/api/receipt-types/99999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Receipt type not found');
    });
  });

  describe('POST /api/receipt-types', () => {
    it('should create a receipt type', async () => {
      const typeData = createReceiptTypeFixture();

      const response = await request(app).post('/api/receipt-types').send(typeData);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe(typeData.name);
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app).post('/api/receipt-types').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Receipt type name is required');
    });

    it('should return 400 if name is empty', async () => {
      const response = await request(app).post('/api/receipt-types').send({ name: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Receipt type name is required');
    });
  });

  describe('PUT /api/receipt-types/:id', () => {
    it('should update a receipt type', async () => {
      const { createReceiptType } = await import('../../src/services/dbService');
      const type = createReceiptType('Original Type');

      const response = await request(app)
        .put(`/api/receipt-types/${type.id}`)
        .send({ name: 'Updated Type' });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(type.id);
      expect(response.body.name).toBe('Updated Type');
    });

    it('should return 404 for non-existent receipt type', async () => {
      const response = await request(app)
        .put('/api/receipt-types/99999')
        .send({ name: 'New Type' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Receipt type not found');
    });

    it('should return 400 if name is empty string', async () => {
      const { createReceiptType } = await import('../../src/services/dbService');
      const type = createReceiptType('Test Type');

      const response = await request(app)
        .put(`/api/receipt-types/${type.id}`)
        .send({ name: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Receipt type name must be a non-empty string');
    });
  });

  describe('DELETE /api/receipt-types/:id', () => {
    it('should delete a receipt type', async () => {
      const { createReceiptType } = await import('../../src/services/dbService');
      const type = createReceiptType('Test Type');

      const response = await request(app).delete(`/api/receipt-types/${type.id}`);

      expect(response.status).toBe(204);
    });

    it('should return 404 for non-existent receipt type', async () => {
      const response = await request(app).delete('/api/receipt-types/99999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Receipt type not found');
    });
  });
});

