import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { setupTestDb, clearTestDb, teardownTestDb, createTestDbQueries } from '../helpers/testDb';
import { createReceiptFixture, createFlagFixture } from '../helpers/fixtures';
import type { Database } from 'better-sqlite3';

// Create test database and queries
const testDb = setupTestDb();
const testQueries = createTestDbQueries(testDb);

// Mock the db module using factory function to avoid hoisting issues
vi.mock('../../src/db', () => {
  const testDb = setupTestDb();
  const testQueries = createTestDbQueries(testDb);
  return {
    dbQueries: testQueries,
    db: testDb,
    default: testDb,
  };
});

import {
  getReceiptById,
  getAllReceipts,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  addReceiptFile,
  getAllFlags,
  getFlagById,
  createFlag,
  updateFlag,
  deleteFlag,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAllReceiptTypes,
  getReceiptTypeById,
  createReceiptType,
  updateReceiptType,
  deleteReceiptType,
  getSetting,
  setSetting,
  getAllSettings,
} from '../../src/services/dbService';

describe('dbService', () => {
  beforeEach(async () => {
    // Clear the mocked database
    const dbModule = await import('../../src/db');
    const db = dbModule.db;
    db.exec(`
      DELETE FROM receipt_flags;
      DELETE FROM receipt_files;
      DELETE FROM receipts;
      DELETE FROM flags;
      DELETE FROM receipt_types;
      DELETE FROM users;
      DELETE FROM settings;
    `);
  });

  describe('Receipt operations', () => {
    describe('createReceipt', () => {
      it('should create a receipt with all fields', () => {
        const receiptData = createReceiptFixture();
        const receipt = createReceipt(receiptData);

        expect(receipt.id).toBeDefined();
        expect(receipt.user).toBe(receiptData.user);
        expect(receipt.type).toBe(receiptData.type);
        expect(receipt.amount).toBe(receiptData.amount);
        expect(receipt.vendor).toBe(receiptData.vendor);
        expect(receipt.description).toBe(receiptData.description);
        expect(receipt.date).toBe(receiptData.date);
        expect(receipt.notes).toBe(receiptData.notes);
        expect(receipt.files).toEqual([]);
        expect(receipt.flags).toEqual([]);
      });

      it('should create a receipt with defaults for optional fields', () => {
        const receipt = createReceipt({});

        expect(receipt.user).toBe('Unknown');
        expect(receipt.type).toBe('Other');
        expect(receipt.amount).toBe(0);
        expect(receipt.vendor).toBe('');
        expect(receipt.description).toBe('');
        expect(receipt.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      it('should create a receipt with flags', () => {
        const flag1 = createFlag('Flag 1');
        const flag2 = createFlag('Flag 2');
        const receiptData = createReceiptFixture();
        const receipt = createReceipt(receiptData, [flag1.id, flag2.id]);

        expect(receipt.flags).toHaveLength(2);
        expect(receipt.flags.map((f) => f.id)).toContain(flag1.id);
        expect(receipt.flags.map((f) => f.id)).toContain(flag2.id);
      });
    });

    describe('getReceiptById', () => {
      it('should get a receipt by ID with files and flags', async () => {
        const receiptData = createReceiptFixture();
        const receipt = createReceipt(receiptData);

        const flag = createFlag('Test Flag');
        await updateReceipt(receipt.id, {}, [flag.id]);

        addReceiptFile(receipt.id, 'file1.pdf', 'original1.pdf', 0);
        addReceiptFile(receipt.id, 'file2.pdf', 'original2.pdf', 1);

        const found = getReceiptById(receipt.id);

        expect(found).toBeDefined();
        expect(found?.id).toBe(receipt.id);
        expect(found?.files).toHaveLength(2);
        expect(found?.flags).toHaveLength(1);
        expect(found?.flags[0].id).toBe(flag.id);
      });

      it('should return null for non-existent receipt', () => {
        const found = getReceiptById(99999);
        expect(found).toBeNull();
      });
    });

    describe('getAllReceipts', () => {
      it('should get all receipts', () => {
        createReceipt(createReceiptFixture({ user: 'User 1' }));
        createReceipt(createReceiptFixture({ user: 'User 2' }));
        createReceipt(createReceiptFixture({ user: 'User 3' }));

        const receipts = getAllReceipts();
        expect(receipts).toHaveLength(3);
      });

      it('should filter receipts by flag', () => {
        const flag = createFlag('Filter Flag');
        const receipt1 = createReceipt(createReceiptFixture(), [flag.id]);
        const receipt2 = createReceipt(createReceiptFixture());
        createReceipt(createReceiptFixture(), [flag.id]);

        const filtered = getAllReceipts(flag.id);
        expect(filtered).toHaveLength(2);
        expect(filtered.map((r) => r.id)).toContain(receipt1.id);
        expect(filtered.map((r) => r.id)).not.toContain(receipt2.id);
      });

      it('should return empty array when no receipts exist', () => {
        const receipts = getAllReceipts();
        expect(receipts).toEqual([]);
      });
    });

    describe('updateReceipt', () => {
      it('should update receipt fields', async () => {
        const receipt = createReceipt(createReceiptFixture());
        const updated = await updateReceipt(receipt.id, {
          vendor: 'Updated Vendor',
          amount: 200.75,
        });

        expect(updated?.vendor).toBe('Updated Vendor');
        expect(updated?.amount).toBe(200.75);
        expect(updated?.user).toBe(receipt.user); // Unchanged
      });

      it('should update receipt flags', async () => {
        const receipt = createReceipt(createReceiptFixture());
        const flag1 = createFlag('Flag 1');
        const flag2 = createFlag('Flag 2');

        await updateReceipt(receipt.id, {}, [flag1.id]);
        let updated = getReceiptById(receipt.id);
        expect(updated?.flags).toHaveLength(1);

        await updateReceipt(receipt.id, {}, [flag2.id]);
        updated = getReceiptById(receipt.id);
        expect(updated?.flags).toHaveLength(1);
        expect(updated?.flags[0].id).toBe(flag2.id);
      });

      it('should return null for non-existent receipt', async () => {
        const updated = await updateReceipt(99999, { vendor: 'Test' });
        expect(updated).toBeNull();
      });
    });

    describe('deleteReceipt', () => {
      it('should delete a receipt', () => {
        const receipt = createReceipt(createReceiptFixture());
        const deleted = deleteReceipt(receipt.id);

        expect(deleted).toBe(true);
        expect(getReceiptById(receipt.id)).toBeNull();
      });

      it('should return false for non-existent receipt', () => {
        const deleted = deleteReceipt(99999);
        expect(deleted).toBe(false);
      });

      it('should cascade delete files and flags', async () => {
        const receipt = createReceipt(createReceiptFixture());
        const flag = createFlag('Test Flag');
        await updateReceipt(receipt.id, {}, [flag.id]);
        addReceiptFile(receipt.id, 'file.pdf', 'original.pdf', 0);

        deleteReceipt(receipt.id);

        const found = getReceiptById(receipt.id);
        expect(found).toBeNull();
      });
    });

    describe('addReceiptFile', () => {
      it('should add a file to a receipt', () => {
        const receipt = createReceipt(createReceiptFixture());
        const file = addReceiptFile(receipt.id, 'file.pdf', 'original.pdf', 0);

        expect(file.id).toBeDefined();
        expect(file.receipt_id).toBe(receipt.id);
        expect(file.filename).toBe('file.pdf');
        expect(file.original_filename).toBe('original.pdf');
        expect(file.file_order).toBe(0);

        const receiptWithFiles = getReceiptById(receipt.id);
        expect(receiptWithFiles?.files).toHaveLength(1);
      });

      it('should maintain file order', () => {
        const receipt = createReceipt(createReceiptFixture());
        addReceiptFile(receipt.id, 'file1.pdf', 'original1.pdf', 0);
        addReceiptFile(receipt.id, 'file2.pdf', 'original2.pdf', 1);
        addReceiptFile(receipt.id, 'file3.pdf', 'original3.pdf', 2);

        const receiptWithFiles = getReceiptById(receipt.id);
        expect(receiptWithFiles?.files).toHaveLength(3);
        expect(receiptWithFiles?.files[0].file_order).toBe(0);
        expect(receiptWithFiles?.files[1].file_order).toBe(1);
        expect(receiptWithFiles?.files[2].file_order).toBe(2);
      });
    });
  });

  describe('Flag operations', () => {
    describe('createFlag', () => {
      it('should create a flag', () => {
        const flagData = createFlagFixture();
        const flag = createFlag(flagData.name, flagData.color);

        expect(flag.id).toBeDefined();
        expect(flag.name).toBe(flagData.name);
        expect(flag.color).toBe(flagData.color);
      });

      it('should create a flag without color', () => {
        const flag = createFlag('Test Flag');
        expect(flag.name).toBe('Test Flag');
        expect(flag.color).toBeNull();
      });
    });

    describe('getFlagById', () => {
      it('should get a flag by ID', () => {
        const flag = createFlag('Test Flag', '#FF0000');
        const found = getFlagById(flag.id);

        expect(found?.id).toBe(flag.id);
        expect(found?.name).toBe('Test Flag');
      });

      it('should return null for non-existent flag', () => {
        const found = getFlagById(99999);
        expect(found).toBeNull();
      });
    });

    describe('getAllFlags', () => {
      it('should get all flags', () => {
        createFlag('Flag 1');
        createFlag('Flag 2');
        createFlag('Flag 3');

        const flags = getAllFlags();
        expect(flags.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('updateFlag', () => {
      it('should update flag name', () => {
        const flag = createFlag('Old Name');
        const updated = updateFlag(flag.id, 'New Name');

        expect(updated?.name).toBe('New Name');
      });

      it('should update flag color', () => {
        const flag = createFlag('Test Flag');
        const updated = updateFlag(flag.id, undefined, '#00FF00');

        expect(updated?.color).toBe('#00FF00');
      });

      it('should return null for non-existent flag', () => {
        const updated = updateFlag(99999, 'New Name');
        expect(updated).toBeNull();
      });
    });

    describe('deleteFlag', () => {
      it('should delete a flag', () => {
        const flag = createFlag('Test Flag');
        const deleted = deleteFlag(flag.id);

        expect(deleted).toBe(true);
        expect(getFlagById(flag.id)).toBeNull();
      });

      it('should return false for non-existent flag', () => {
        const deleted = deleteFlag(99999);
        expect(deleted).toBe(false);
      });
    });
  });

  describe('Settings operations', () => {
    describe('setSetting and getSetting', () => {
      it('should set and get a setting', () => {
        setSetting('test_key', 'test_value');
        const value = getSetting('test_key');

        expect(value).toBe('test_value');
      });

      it('should return null for non-existent setting', () => {
        const value = getSetting('non_existent');
        expect(value).toBeNull();
      });

      it('should overwrite existing setting', () => {
        setSetting('test_key', 'value1');
        setSetting('test_key', 'value2');
        const value = getSetting('test_key');

        expect(value).toBe('value2');
      });
    });

    describe('getAllSettings', () => {
      it('should get all settings', () => {
        setSetting('key1', 'value1');
        setSetting('key2', 'value2');
        setSetting('key3', 'value3');

        const settings = getAllSettings();
        expect(settings.key1).toBe('value1');
        expect(settings.key2).toBe('value2');
        expect(settings.key3).toBe('value3');
      });

      it('should return empty object when no settings exist', () => {
        const settings = getAllSettings();
        expect(Object.keys(settings)).toHaveLength(0);
      });
    });
  });

  describe('User operations', () => {
    describe('createUser', () => {
      it('should create a user', () => {
        const user = createUser('Test User');
        expect(user.id).toBeDefined();
        expect(user.name).toBe('Test User');
        expect(user.created_at).toBeDefined();
      });
    });

    describe('getUserById', () => {
      it('should get a user by ID', () => {
        const user = createUser('Test User');
        const found = getUserById(user.id);
        expect(found).toBeDefined();
        expect(found?.id).toBe(user.id);
        expect(found?.name).toBe('Test User');
      });

      it('should return null for non-existent user', () => {
        const found = getUserById(99999);
        expect(found).toBeNull();
      });
    });

    describe('getAllUsers', () => {
      it('should get all users', () => {
        createUser('User 1');
        createUser('User 2');
        createUser('User 3');

        const users = getAllUsers();
        expect(users).toHaveLength(3);
      });
    });

    describe('updateUser', () => {
      it('should update user name', () => {
        const user = createUser('Original Name');
        const updated = updateUser(user.id, 'Updated Name');

        expect(updated?.name).toBe('Updated Name');
        expect(updated?.id).toBe(user.id);
      });

      it('should return null for non-existent user', () => {
        const updated = updateUser(99999, 'New Name');
        expect(updated).toBeNull();
      });
    });

    describe('deleteUser', () => {
      it('should delete a user', () => {
        const user = createUser('Test User');
        const deleted = deleteUser(user.id);
        expect(deleted).toBe(true);

        const found = getUserById(user.id);
        expect(found).toBeNull();
      });

      it('should return false for non-existent user', () => {
        const deleted = deleteUser(99999);
        expect(deleted).toBe(false);
      });
    });
  });

  describe('ReceiptType operations', () => {
    describe('createReceiptType', () => {
      it('should create a receipt type', () => {
        const type = createReceiptType('Test Type');
        expect(type.id).toBeDefined();
        expect(type.name).toBe('Test Type');
        expect(type.created_at).toBeDefined();
      });
    });

    describe('getReceiptTypeById', () => {
      it('should get a receipt type by ID', () => {
        const type = createReceiptType('Test Type');
        const found = getReceiptTypeById(type.id);
        expect(found).toBeDefined();
        expect(found?.id).toBe(type.id);
        expect(found?.name).toBe('Test Type');
      });

      it('should return null for non-existent receipt type', () => {
        const found = getReceiptTypeById(99999);
        expect(found).toBeNull();
      });
    });

    describe('getAllReceiptTypes', () => {
      it('should get all receipt types', () => {
        createReceiptType('Type 1');
        createReceiptType('Type 2');
        createReceiptType('Type 3');

        const types = getAllReceiptTypes();
        expect(types).toHaveLength(3);
      });
    });

    describe('updateReceiptType', () => {
      it('should update receipt type name', () => {
        const type = createReceiptType('Original Type');
        const updated = updateReceiptType(type.id, 'Updated Type');

        expect(updated?.name).toBe('Updated Type');
        expect(updated?.id).toBe(type.id);
      });

      it('should return null for non-existent receipt type', () => {
        const updated = updateReceiptType(99999, 'New Type');
        expect(updated).toBeNull();
      });
    });

    describe('deleteReceiptType', () => {
      it('should delete a receipt type', () => {
        const type = createReceiptType('Test Type');
        const deleted = deleteReceiptType(type.id);
        expect(deleted).toBe(true);

        const found = getReceiptTypeById(type.id);
        expect(found).toBeNull();
      });

      it('should return false for non-existent receipt type', () => {
        const deleted = deleteReceiptType(99999);
        expect(deleted).toBe(false);
      });
    });
  });
});

