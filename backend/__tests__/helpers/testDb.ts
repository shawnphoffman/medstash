import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { dbQueries } from '../../src/db';

let testDb: DatabaseType | null = null;

/**
 * Initialize an in-memory test database with the same schema
 */
export function setupTestDb(): DatabaseType {
  testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');

  // Initialize schema (same as production)
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS receipt_type_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS receipt_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      group_id INTEGER,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      receipt_type_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      vendor TEXT NOT NULL,
      provider_address TEXT NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (receipt_type_id) REFERENCES receipt_types(id)
    );

    CREATE TABLE IF NOT EXISTS receipt_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_optimized INTEGER NOT NULL DEFAULT 0,
      optimized_at TEXT,
      FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS receipt_flags (
      receipt_id INTEGER NOT NULL,
      flag_id INTEGER NOT NULL,
      PRIMARY KEY (receipt_id, flag_id),
      FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
      FOREIGN KEY (flag_id) REFERENCES flags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
    CREATE INDEX IF NOT EXISTS idx_receipts_receipt_type_id ON receipts(receipt_type_id);
    CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date);
    CREATE INDEX IF NOT EXISTS idx_receipt_files_receipt_id ON receipt_files(receipt_id);
    CREATE INDEX IF NOT EXISTS idx_receipt_flags_receipt_id ON receipt_flags(receipt_id);
    CREATE INDEX IF NOT EXISTS idx_receipt_flags_flag_id ON receipt_flags(flag_id);
    CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
    CREATE INDEX IF NOT EXISTS idx_receipt_types_name ON receipt_types(name);
    CREATE INDEX IF NOT EXISTS idx_receipt_types_group_id ON receipt_types(group_id);
    CREATE INDEX IF NOT EXISTS idx_receipt_type_groups_display_order ON receipt_type_groups(display_order);
  `);

  return testDb;
}

/**
 * Get the test database instance
 */
export function getTestDb(): DatabaseType {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDb() first.');
  }
  return testDb;
}

/**
 * Clear all data from test database
 */
export function clearTestDb(): void {
  if (!testDb) return;

  testDb.exec(`
    DELETE FROM receipt_flags;
    DELETE FROM receipt_files;
    DELETE FROM receipts;
    DELETE FROM flags;
    DELETE FROM receipt_types;
    DELETE FROM receipt_type_groups;
    DELETE FROM users;
    DELETE FROM settings;
  `);
}

/**
 * Teardown test database
 */
export function teardownTestDb(): void {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
}

/**
 * Create prepared statements for test database
 */
export function createTestDbQueries(db: DatabaseType) {
  return {
    getReceiptById: db.prepare('SELECT * FROM receipts WHERE id = ?'),
    getAllReceipts: db.prepare('SELECT * FROM receipts ORDER BY date DESC, created_at DESC'),
    getReceiptsByUser: db.prepare('SELECT * FROM receipts WHERE user_id = ? ORDER BY date DESC, created_at DESC'),
    getReceiptsByReceiptType: db.prepare('SELECT * FROM receipts WHERE receipt_type_id = ?'),
    getReceiptsByFlag: db.prepare(`
      SELECT DISTINCT r.* FROM receipts r
      INNER JOIN receipt_flags rf ON r.id = rf.receipt_id
      WHERE rf.flag_id = ?
      ORDER BY r.date DESC, r.created_at DESC
    `),
    insertReceipt: db.prepare(`
      INSERT INTO receipts (user_id, receipt_type_id, amount, vendor, provider_address, description, date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateReceipt: db.prepare(`
      UPDATE receipts
      SET user_id = ?, receipt_type_id = ?, amount = ?, vendor = ?, provider_address = ?, description = ?, date = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `),
    deleteReceipt: db.prepare('DELETE FROM receipts WHERE id = ?'),
    getFilesByReceiptId: db.prepare('SELECT * FROM receipt_files WHERE receipt_id = ? ORDER BY file_order'),
    getFileById: db.prepare('SELECT * FROM receipt_files WHERE id = ?'),
    insertReceiptFile: db.prepare(`
      INSERT INTO receipt_files (receipt_id, filename, original_filename, file_order)
      VALUES (?, ?, ?, ?)
    `),
    updateReceiptFilename: db.prepare('UPDATE receipt_files SET filename = ? WHERE id = ?'),
    updateReceiptFileOptimized: db.prepare(`
      UPDATE receipt_files 
      SET is_optimized = 1, optimized_at = datetime('now')
      WHERE id = ?
    `),
    resetReceiptFileOptimized: db.prepare(`
      UPDATE receipt_files 
      SET is_optimized = 0, optimized_at = NULL
      WHERE id = ?
    `),
    getUnoptimizedFiles: db.prepare(`
      SELECT * FROM receipt_files 
      WHERE is_optimized = 0 OR is_optimized IS NULL
      ORDER BY created_at
    `),
    deleteReceiptFile: db.prepare('DELETE FROM receipt_files WHERE id = ?'),
    deleteFilesByReceiptId: db.prepare('DELETE FROM receipt_files WHERE receipt_id = ?'),
    getAllFlags: db.prepare('SELECT * FROM flags ORDER BY name'),
    getFlagById: db.prepare('SELECT * FROM flags WHERE id = ?'),
    getFlagByName: db.prepare('SELECT * FROM flags WHERE name = ?'),
    insertFlag: db.prepare('INSERT INTO flags (name, color) VALUES (?, ?)'),
    updateFlag: db.prepare('UPDATE flags SET name = ?, color = ? WHERE id = ?'),
    deleteFlag: db.prepare('DELETE FROM flags WHERE id = ?'),
    getFlagsByReceiptId: db.prepare(`
      SELECT f.* FROM flags f
      INNER JOIN receipt_flags rf ON f.id = rf.flag_id
      WHERE rf.receipt_id = ?
      ORDER BY f.name
    `),
    deleteReceiptFlags: db.prepare('DELETE FROM receipt_flags WHERE receipt_id = ?'),
    insertReceiptFlag: db.prepare('INSERT INTO receipt_flags (receipt_id, flag_id) VALUES (?, ?)'),
    getAllUsers: db.prepare('SELECT * FROM users ORDER BY name'),
    getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
    getUserByName: db.prepare('SELECT * FROM users WHERE name = ?'),
    insertUser: db.prepare('INSERT INTO users (name) VALUES (?)'),
    updateUser: db.prepare('UPDATE users SET name = ? WHERE id = ?'),
    deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),
    getAllReceiptTypes: db.prepare(`
      SELECT rt.*, rtg.name as group_name, rtg.display_order as group_display_order
      FROM receipt_types rt
      LEFT JOIN receipt_type_groups rtg ON rt.group_id = rtg.id
      ORDER BY rtg.display_order, rtg.name, rt.display_order, rt.name
    `),
    getReceiptTypeById: db.prepare('SELECT * FROM receipt_types WHERE id = ?'),
    getReceiptTypeByName: db.prepare('SELECT * FROM receipt_types WHERE name = ?'),
    getReceiptTypesByGroupId: db.prepare(`
      SELECT * FROM receipt_types 
      WHERE group_id = ? 
      ORDER BY display_order, name
    `),
    insertReceiptType: db.prepare('INSERT INTO receipt_types (name, group_id, display_order) VALUES (?, ?, ?)'),
    updateReceiptType: db.prepare('UPDATE receipt_types SET name = ?, group_id = ?, display_order = ? WHERE id = ?'),
    updateReceiptTypeGroupId: db.prepare('UPDATE receipt_types SET group_id = ?, display_order = ? WHERE id = ?'),
    deleteReceiptType: db.prepare('DELETE FROM receipt_types WHERE id = ?'),
    getAllReceiptTypeGroups: db.prepare('SELECT * FROM receipt_type_groups ORDER BY display_order, name'),
    getReceiptTypeGroupById: db.prepare('SELECT * FROM receipt_type_groups WHERE id = ?'),
    getReceiptTypeGroupByName: db.prepare('SELECT * FROM receipt_type_groups WHERE name = ?'),
    insertReceiptTypeGroup: db.prepare('INSERT INTO receipt_type_groups (name, display_order) VALUES (?, ?)'),
    updateReceiptTypeGroup: db.prepare('UPDATE receipt_type_groups SET name = ?, display_order = ? WHERE id = ?'),
    deleteReceiptTypeGroup: db.prepare('DELETE FROM receipt_type_groups WHERE id = ?'),
    ungroupReceiptTypes: db.prepare('UPDATE receipt_types SET group_id = NULL WHERE group_id = ?'),
    getSetting: db.prepare('SELECT value FROM settings WHERE key = ?'),
    setSetting: db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'),
    getAllSettings: db.prepare('SELECT * FROM settings'),
  };
}

