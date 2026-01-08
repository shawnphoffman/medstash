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

describe('Settings API', () => {
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

  describe('GET /api/settings', () => {
    it('should return empty object when no settings exist', async () => {
      const response = await request(app).get('/api/settings');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({});
    });

    it('should return all settings', async () => {
      dbQueries.setSetting.run('filenamePattern', JSON.stringify('{date}_{user}_{vendor}'));
      dbQueries.setSetting.run('invalid_key', JSON.stringify('value')); // Direct DB insert bypasses validation

      const response = await request(app).get('/api/settings');
      expect(response.status).toBe(200);
      expect(response.body.filenamePattern).toBe('{date}_{user}_{vendor}');
      // Invalid keys in DB can still be read, but can't be set via API
    });

    it('should parse JSON values', async () => {
      dbQueries.setSetting.run('filenamePattern', JSON.stringify('{date}_{index}'));

      const response = await request(app).get('/api/settings');
      expect(response.status).toBe(200);
      expect(response.body.filenamePattern).toBe('{date}_{index}');
    });

    it('should handle non-JSON values gracefully', async () => {
      dbQueries.setSetting.run('filenamePattern', 'not-json');

      const response = await request(app).get('/api/settings');
      expect(response.status).toBe(200);
      expect(response.body.filenamePattern).toBe('not-json');
    });
  });

  describe('GET /api/settings/:key', () => {
    it('should return a specific setting', async () => {
      dbQueries.setSetting.run('filenamePattern', JSON.stringify('{date}_{user}'));

      const response = await request(app).get('/api/settings/filenamePattern');
      expect(response.status).toBe(200);
      expect(response.body.key).toBe('filenamePattern');
      expect(response.body.value).toBe('{date}_{user}');
    });

    it('should parse JSON value', async () => {
      dbQueries.setSetting.run('filenamePattern', JSON.stringify('{date}_{vendor}_{index}'));

      const response = await request(app).get('/api/settings/filenamePattern');
      expect(response.status).toBe(200);
      expect(response.body.value).toBe('{date}_{vendor}_{index}');
    });

    it('should return 404 for non-existent setting', async () => {
      const response = await request(app).get('/api/settings/filenamePattern');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Setting not found');
    });

    it('should return 400 for invalid setting key', async () => {
      const response = await request(app).get('/api/settings/invalid_key');
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid setting key');
    });
  });

  describe('PUT /api/settings/:key', () => {
    it('should set filenamePattern setting', async () => {
      const response = await request(app)
        .put('/api/settings/filenamePattern')
        .send({
          value: '{date}_{user}_{vendor}',
        });

      expect(response.status).toBe(200);
      expect(response.body.key).toBe('filenamePattern');
      expect(response.body.value).toBe('{date}_{user}_{vendor}');

      // Verify it was saved
      const getResponse = await request(app).get('/api/settings/filenamePattern');
      expect(getResponse.body.value).toBe('{date}_{user}_{vendor}');
    });

    it('should overwrite existing setting', async () => {
      dbQueries.setSetting.run('filenamePattern', JSON.stringify('{date}_{index}'));

      const response = await request(app)
        .put('/api/settings/filenamePattern')
        .send({
          value: '{date}_{user}_{vendor}_{index}',
        });

      expect(response.status).toBe(200);
      expect(response.body.value).toBe('{date}_{user}_{vendor}_{index}');
    });

    it('should return 400 if value is missing', async () => {
      const response = await request(app)
        .put('/api/settings/filenamePattern')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Value is required');
    });

    it('should return 400 for invalid setting key', async () => {
      const response = await request(app)
        .put('/api/settings/invalid_key')
        .send({ value: 'test' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid setting key');
    });

    it('should return 400 for invalid filenamePattern value (not a string)', async () => {
      const response = await request(app)
        .put('/api/settings/filenamePattern')
        .send({ value: 123 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('filenamePattern must be a string');
    });

    it('should return 400 for invalid filenamePattern format', async () => {
      const response = await request(app)
        .put('/api/settings/filenamePattern')
        .send({ value: '{invalid_token}' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Unknown token');
    });

    it('should accept valid filenamePattern', async () => {
      const response = await request(app)
        .put('/api/settings/filenamePattern')
        .send({ value: '{date}_{user}_{vendor}_{amount}_{type}_{index}' });

      expect(response.status).toBe(200);
      expect(response.body.value).toBe('{date}_{user}_{vendor}_{amount}_{type}_{index}');
    });
  });
});

