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
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      vendor TEXT NOT NULL,
      provider_address TEXT NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS receipt_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
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

    CREATE INDEX IF NOT EXISTS idx_receipts_user ON receipts(user);
    CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date);
    CREATE INDEX IF NOT EXISTS idx_receipt_files_receipt_id ON receipt_files(receipt_id);
    CREATE INDEX IF NOT EXISTS idx_receipt_flags_receipt_id ON receipt_flags(receipt_id);
    CREATE INDEX IF NOT EXISTS idx_receipt_flags_flag_id ON receipt_flags(flag_id);
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
    getReceiptsByFlag: db.prepare(`
      SELECT DISTINCT r.* FROM receipts r
      INNER JOIN receipt_flags rf ON r.id = rf.receipt_id
      WHERE rf.flag_id = ?
      ORDER BY r.date DESC, r.created_at DESC
    `),
    insertReceipt: db.prepare(`
      INSERT INTO receipts (user, type, amount, vendor, provider_address, description, date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateReceipt: db.prepare(`
      UPDATE receipts
      SET user = ?, type = ?, amount = ?, vendor = ?, provider_address = ?, description = ?, date = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `),
    deleteReceipt: db.prepare('DELETE FROM receipts WHERE id = ?'),
    getFilesByReceiptId: db.prepare('SELECT * FROM receipt_files WHERE receipt_id = ? ORDER BY file_order'),
    insertReceiptFile: db.prepare(`
      INSERT INTO receipt_files (receipt_id, filename, original_filename, file_order)
      VALUES (?, ?, ?, ?)
    `),
    deleteReceiptFile: db.prepare('DELETE FROM receipt_files WHERE id = ?'),
    deleteFilesByReceiptId: db.prepare('DELETE FROM receipt_files WHERE receipt_id = ?'),
    getAllFlags: db.prepare('SELECT * FROM flags ORDER BY name'),
    getFlagById: db.prepare('SELECT * FROM flags WHERE id = ?'),
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
    getSetting: db.prepare('SELECT value FROM settings WHERE key = ?'),
    setSetting: db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'),
    getAllSettings: db.prepare('SELECT * FROM settings'),
  };
}

