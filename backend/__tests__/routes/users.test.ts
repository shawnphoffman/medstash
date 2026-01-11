import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/testServer';
import { setupTestDb, createTestDbQueries } from '../helpers/testDb';
import { createUserFixture } from '../helpers/fixtures';

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

describe('Users API', () => {
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

  describe('GET /api/users', () => {
    it('should get all users', async () => {
      const { createUser } = await import('../../src/services/dbService');
      createUser('User 1');
      createUser('User 2');

      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.map((u: any) => u.name)).toContain('User 1');
      expect(response.body.map((u: any) => u.name)).toContain('User 2');
    });
  });

  describe('POST /api/users', () => {
    it('should create a user', async () => {
      const userData = createUserFixture();

      const response = await request(app).post('/api/users').send(userData);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe(userData.name);
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app).post('/api/users').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User name is required');
    });

  });

  describe('PUT /api/users/:id', () => {
    it('should update a user', async () => {
      const { createUser } = await import('../../src/services/dbService');
      const user = createUser('Original Name');

      const response = await request(app)
        .put(`/api/users/${user.id}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(user.id);
      expect(response.body.name).toBe('Updated Name');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/api/users/99999')
        .send({ name: 'New Name' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 if name is empty string', async () => {
      const { createUser } = await import('../../src/services/dbService');
      const user = createUser('Test User');

      const response = await request(app)
        .put(`/api/users/${user.id}`)
        .send({ name: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User name must be a non-empty string');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete a user', async () => {
      const { createUser } = await import('../../src/services/dbService');
      const user = createUser('Test User');

      const response = await request(app).delete(`/api/users/${user.id}`);

      expect(response.status).toBe(204);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app).delete('/api/users/99999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should reject invalid user ID (non-numeric)', async () => {
      const response = await request(app).delete('/api/users/abc');
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid user ID');
    });
  });
});

