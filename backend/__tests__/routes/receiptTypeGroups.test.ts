import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/testServer';
import { setupTestDb, createTestDbQueries } from '../helpers/testDb';
import { createReceiptTypeGroupFixture } from '../helpers/fixtures';

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

describe('ReceiptTypeGroups API', () => {
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
      DELETE FROM receipt_type_groups;
      DELETE FROM users;
    `);
  });

  describe('GET /api/receipt-type-groups', () => {
    it('should get all receipt type groups', async () => {
      const { createReceiptTypeGroup } = await import('../../src/services/dbService');
      createReceiptTypeGroup('Group 1');
      createReceiptTypeGroup('Group 2');

      const response = await request(app).get('/api/receipt-type-groups');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.map((g: any) => g.name)).toContain('Group 1');
      expect(response.body.map((g: any) => g.name)).toContain('Group 2');
    });

    it('should return empty array when no groups exist', async () => {
      const response = await request(app).get('/api/receipt-type-groups');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/receipt-type-groups/:id', () => {
    it('should get a receipt type group by ID', async () => {
      const { createReceiptTypeGroup } = await import('../../src/services/dbService');
      const group = createReceiptTypeGroup('Test Group');

      const response = await request(app).get(`/api/receipt-type-groups/${group.id}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(group.id);
      expect(response.body.name).toBe('Test Group');
    });

    it('should return 404 for non-existent group', async () => {
      const response = await request(app).get('/api/receipt-type-groups/99999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Receipt type group not found');
    });
  });

  describe('POST /api/receipt-type-groups', () => {
    it('should create a receipt type group', async () => {
      const groupData = createReceiptTypeGroupFixture();

      const response = await request(app).post('/api/receipt-type-groups').send(groupData);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe(groupData.name);
    });

    it('should create a group with display_order', async () => {
      const response = await request(app)
        .post('/api/receipt-type-groups')
        .send({ name: 'Test Group', display_order: 5 });

      expect(response.status).toBe(201);
      expect(response.body.display_order).toBe(5);
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app).post('/api/receipt-type-groups').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Receipt type group name is required');
    });

    it('should return 400 if name is empty', async () => {
      const response = await request(app).post('/api/receipt-type-groups').send({ name: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Receipt type group name is required');
    });

    it('should return 400 if display_order is not a number', async () => {
      const response = await request(app)
        .post('/api/receipt-type-groups')
        .send({ name: 'Test Group', display_order: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Display order must be a number');
    });
  });

  describe('PUT /api/receipt-type-groups/:id', () => {
    it('should update a receipt type group', async () => {
      const { createReceiptTypeGroup } = await import('../../src/services/dbService');
      const group = createReceiptTypeGroup('Original Group');

      const response = await request(app)
        .put(`/api/receipt-type-groups/${group.id}`)
        .send({ name: 'Updated Group' });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(group.id);
      expect(response.body.name).toBe('Updated Group');
    });

    it('should update display_order', async () => {
      const { createReceiptTypeGroup } = await import('../../src/services/dbService');
      const group = createReceiptTypeGroup('Test Group', 0);

      const response = await request(app)
        .put(`/api/receipt-type-groups/${group.id}`)
        .send({ display_order: 10 });

      expect(response.status).toBe(200);
      expect(response.body.display_order).toBe(10);
    });

    it('should return 404 for non-existent group', async () => {
      const response = await request(app)
        .put('/api/receipt-type-groups/99999')
        .send({ name: 'New Group' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Receipt type group not found');
    });

    it('should return 400 if name is empty string', async () => {
      const { createReceiptTypeGroup } = await import('../../src/services/dbService');
      const group = createReceiptTypeGroup('Test Group');

      const response = await request(app)
        .put(`/api/receipt-type-groups/${group.id}`)
        .send({ name: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Receipt type group name must be a non-empty string');
    });
  });

  describe('DELETE /api/receipt-type-groups/:id', () => {
    it('should delete a receipt type group and ungroup types', async () => {
      const { createReceiptTypeGroup, createReceiptType } = await import('../../src/services/dbService');
      const group = createReceiptTypeGroup('Test Group');
      const type = createReceiptType('Test Type', group.id);

      const response = await request(app).delete(`/api/receipt-type-groups/${group.id}`);

      expect(response.status).toBe(204);

      // Verify group is deleted
      const { getReceiptTypeGroupById } = await import('../../src/services/dbService');
      const deletedGroup = getReceiptTypeGroupById(group.id);
      expect(deletedGroup).toBeNull();

      // Verify type is ungrouped
      const { getReceiptTypeById } = await import('../../src/services/dbService');
      const ungroupedType = getReceiptTypeById(type.id);
      expect(ungroupedType).toBeDefined();
      expect(ungroupedType?.group_id).toBeNull();
    });

    it('should return 404 for non-existent group', async () => {
      const response = await request(app).delete('/api/receipt-type-groups/99999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Receipt type group not found');
    });

    it('should reject invalid group ID (non-numeric)', async () => {
      const response = await request(app).get('/api/receipt-type-groups/abc');
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid receipt type group ID');
    });
  });
});
