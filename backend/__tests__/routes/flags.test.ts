import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/testServer';
import { setupTestDb, clearTestDb, createTestDbQueries } from '../helpers/testDb';

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

describe('Flags API', () => {
  const app = createTestApp();
  let dbQueries: ReturnType<typeof createTestDbQueries>;

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
  });

  describe('GET /api/flags', () => {
    it('should return all flags', async () => {
      dbQueries.insertFlag.run('Flag 1', '#FF0000');
      dbQueries.insertFlag.run('Flag 2', '#00FF00');
      dbQueries.insertFlag.run('Flag 3', null);

      const response = await request(app).get('/api/flags');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
    });
  });

  describe('POST /api/flags', () => {
    it('should create a flag', async () => {
      const response = await request(app)
        .post('/api/flags')
        .send({
          name: 'New Flag',
          color: '#FF0000',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('New Flag');
      expect(response.body.color).toBe('#FF0000');
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/flags')
        .send({
          color: '#FF0000',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Flag name is required');
    });

    it('should trim whitespace from name', async () => {
      const response = await request(app)
        .post('/api/flags')
        .send({
          name: '  Test Flag  ',
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Test Flag');
    });
  });

  describe('PUT /api/flags/:id', () => {
    it('should update flag name', async () => {
      const result = dbQueries.insertFlag.run('Old Name', null);
      const flagId = Number(result.lastInsertRowid);

      const response = await request(app)
        .put(`/api/flags/${flagId}`)
        .send({
          name: 'New Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('New Name');
    });

    it('should return 404 for non-existent flag', async () => {
      const response = await request(app)
        .put('/api/flags/99999')
        .send({
          name: 'New Name',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Flag not found');
    });

    it('should return 400 if name is empty string', async () => {
      const result = dbQueries.insertFlag.run('Test Flag', null);
      const flagId = Number(result.lastInsertRowid);

      const response = await request(app)
        .put(`/api/flags/${flagId}`)
        .send({
          name: '   ',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Flag name must be a non-empty string');
    });
  });

  describe('DELETE /api/flags/:id', () => {
    it('should delete a flag', async () => {
      const result = dbQueries.insertFlag.run('Test Flag', null);
      const flagId = Number(result.lastInsertRowid);

      const response = await request(app).delete(`/api/flags/${flagId}`);

      expect(response.status).toBe(204);
    });

    it('should return 404 for non-existent flag', async () => {
      const response = await request(app).delete('/api/flags/99999');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Flag not found');
    });

    it('should reject invalid flag ID (non-numeric)', async () => {
      const response = await request(app).delete('/api/flags/abc');
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid flag ID');
    });
  });
});

