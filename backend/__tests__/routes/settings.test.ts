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
      dbQueries.setSetting.run('key1', JSON.stringify('value1'));
      dbQueries.setSetting.run('key2', JSON.stringify({ nested: 'value' }));
      dbQueries.setSetting.run('key3', JSON.stringify(123));

      const response = await request(app).get('/api/settings');
      expect(response.status).toBe(200);
      expect(response.body.key1).toBe('value1');
      expect(response.body.key2).toEqual({ nested: 'value' });
      expect(response.body.key3).toBe(123);
    });

    it('should parse JSON values', async () => {
      dbQueries.setSetting.run('json_key', JSON.stringify({ test: 'data' }));

      const response = await request(app).get('/api/settings');
      expect(response.status).toBe(200);
      expect(response.body.json_key).toEqual({ test: 'data' });
    });

    it('should handle non-JSON values gracefully', async () => {
      dbQueries.setSetting.run('plain_key', 'not-json');

      const response = await request(app).get('/api/settings');
      expect(response.status).toBe(200);
      expect(response.body.plain_key).toBe('not-json');
    });
  });

  describe('GET /api/settings/:key', () => {
    it('should return a specific setting', async () => {
      dbQueries.setSetting.run('test_key', JSON.stringify('test_value'));

      const response = await request(app).get('/api/settings/test_key');
      expect(response.status).toBe(200);
      expect(response.body.key).toBe('test_key');
      expect(response.body.value).toBe('test_value');
    });

    it('should parse JSON value', async () => {
      dbQueries.setSetting.run('json_key', JSON.stringify({ nested: 'value' }));

      const response = await request(app).get('/api/settings/json_key');
      expect(response.status).toBe(200);
      expect(response.body.value).toEqual({ nested: 'value' });
    });

    it('should return 404 for non-existent setting', async () => {
      const response = await request(app).get('/api/settings/non_existent');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Setting not found');
    });
  });

  describe('PUT /api/settings/:key', () => {
    it('should set a setting', async () => {
      const response = await request(app)
        .put('/api/settings/test_key')
        .send({
          value: 'test_value',
        });

      expect(response.status).toBe(200);
      expect(response.body.key).toBe('test_key');
      expect(response.body.value).toBe('test_value');

      // Verify it was saved
      const getResponse = await request(app).get('/api/settings/test_key');
      expect(getResponse.body.value).toBe('test_value');
    });

    it('should set a JSON value', async () => {
      const response = await request(app)
        .put('/api/settings/json_key')
        .send({
          value: { nested: 'value' },
        });

      expect(response.status).toBe(200);
      expect(response.body.value).toEqual({ nested: 'value' });
    });

    it('should overwrite existing setting', async () => {
      dbQueries.setSetting.run('test_key', JSON.stringify('old_value'));

      const response = await request(app)
        .put('/api/settings/test_key')
        .send({
          value: 'new_value',
        });

      expect(response.status).toBe(200);
      expect(response.body.value).toBe('new_value');
    });

    it('should return 400 if value is missing', async () => {
      const response = await request(app)
        .put('/api/settings/test_key')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Value is required');
    });

    it('should handle various value types', async () => {
      // String
      await request(app)
        .put('/api/settings/string_key')
        .send({ value: 'string' });

      // Number
      await request(app)
        .put('/api/settings/number_key')
        .send({ value: 123 });

      // Boolean
      await request(app)
        .put('/api/settings/bool_key')
        .send({ value: true });

      // Array
      await request(app)
        .put('/api/settings/array_key')
        .send({ value: [1, 2, 3] });

      // Object
      await request(app)
        .put('/api/settings/object_key')
        .send({ value: { nested: 'value' } });

      const allResponse = await request(app).get('/api/settings');
      expect(allResponse.body.string_key).toBe('string');
      expect(allResponse.body.number_key).toBe(123);
      expect(allResponse.body.bool_key).toBe(true);
      expect(allResponse.body.array_key).toEqual([1, 2, 3]);
      expect(allResponse.body.object_key).toEqual({ nested: 'value' });
    });
  });
});

