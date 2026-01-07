import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = process.env.DB_DIR || '/data';
const DB_PATH = path.join(DB_DIR, 'medstash.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const dbInstance: DatabaseType = new Database(DB_PATH);

// Enable foreign keys
dbInstance.pragma('foreign_keys = ON');

// Initialize schema
dbInstance.exec(`
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

// Prepared statements
const dbQueriesObj = {
  // Receipts
  getReceiptById: dbInstance.prepare('SELECT * FROM receipts WHERE id = ?'),
  getAllReceipts: dbInstance.prepare('SELECT * FROM receipts ORDER BY date DESC, created_at DESC'),
  getReceiptsByUser: dbInstance.prepare('SELECT * FROM receipts WHERE user = ? ORDER BY date DESC, created_at DESC'),
  getReceiptsByFlag: dbInstance.prepare(`
    SELECT DISTINCT r.* FROM receipts r
    INNER JOIN receipt_flags rf ON r.id = rf.receipt_id
    WHERE rf.flag_id = ?
    ORDER BY r.date DESC, r.created_at DESC
  `),
  insertReceipt: dbInstance.prepare(`
    INSERT INTO receipts (user, type, amount, vendor, provider_address, description, date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateReceipt: dbInstance.prepare(`
    UPDATE receipts
    SET user = ?, type = ?, amount = ?, vendor = ?, provider_address = ?, description = ?, date = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `),
  deleteReceipt: dbInstance.prepare('DELETE FROM receipts WHERE id = ?'),

  // Receipt Files
  getFilesByReceiptId: dbInstance.prepare('SELECT * FROM receipt_files WHERE receipt_id = ? ORDER BY file_order'),
  insertReceiptFile: dbInstance.prepare(`
    INSERT INTO receipt_files (receipt_id, filename, original_filename, file_order)
    VALUES (?, ?, ?, ?)
  `),
  updateReceiptFilename: dbInstance.prepare('UPDATE receipt_files SET filename = ? WHERE id = ?'),
  deleteReceiptFile: dbInstance.prepare('DELETE FROM receipt_files WHERE id = ?'),
  deleteFilesByReceiptId: dbInstance.prepare('DELETE FROM receipt_files WHERE receipt_id = ?'),

  // Flags
  getAllFlags: dbInstance.prepare('SELECT * FROM flags ORDER BY name'),
  getFlagById: dbInstance.prepare('SELECT * FROM flags WHERE id = ?'),
  insertFlag: dbInstance.prepare('INSERT INTO flags (name, color) VALUES (?, ?)'),
  updateFlag: dbInstance.prepare('UPDATE flags SET name = ?, color = ? WHERE id = ?'),
  deleteFlag: dbInstance.prepare('DELETE FROM flags WHERE id = ?'),

  // Receipt Flags
  getFlagsByReceiptId: dbInstance.prepare(`
    SELECT f.* FROM flags f
    INNER JOIN receipt_flags rf ON f.id = rf.flag_id
    WHERE rf.receipt_id = ?
    ORDER BY f.name
  `),
  deleteReceiptFlags: dbInstance.prepare('DELETE FROM receipt_flags WHERE receipt_id = ?'),
  insertReceiptFlag: dbInstance.prepare('INSERT INTO receipt_flags (receipt_id, flag_id) VALUES (?, ?)'),

  // Settings
  getSetting: dbInstance.prepare('SELECT value FROM settings WHERE key = ?'),
  setSetting: dbInstance.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'),
  getAllSettings: dbInstance.prepare('SELECT * FROM settings'),
};

// Export dbQueries - TypeScript can't generate declaration files for complex Statement types
// Using type assertion to allow declaration file generation
// Runtime behavior is unchanged, this only affects .d.ts generation
export const dbQueries = dbQueriesObj as Record<string, any>;
export { dbInstance as db };
export default dbInstance;

