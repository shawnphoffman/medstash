import Database from 'better-sqlite3'
import type { Database as DatabaseType } from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { logger } from './utils/logger'
import { runMigrations } from './services/migrationService'

const DB_DIR = process.env.DB_DIR || '/data'
const DB_PATH = path.join(DB_DIR, 'medstash.db')

// Ensure data directory exists
// In test environments, this might fail if DB_DIR is not set properly
// We'll handle it gracefully for in-memory databases
if (!fs.existsSync(DB_DIR)) {
	try {
		fs.mkdirSync(DB_DIR, { recursive: true })
		logger.debug(`Created database directory: ${DB_DIR}`)
	} catch (error: any) {
		// If we're using an in-memory database (indicated by DB_PATH being ':memory:'),
		// we don't need to create the directory
		// This allows tests to work without setting up file system directories
		if (DB_PATH !== ':memory:' && !process.env.VITEST) {
			logger.error(`Failed to create database directory ${DB_DIR}:`, error)
			throw error
		}
		// In test environment, continue without creating directory
		// The actual database will be in-memory anyway
	}
} else {
	logger.debug(`Database directory exists: ${DB_DIR}`)
}

// Check if directory is writable
try {
	fs.accessSync(DB_DIR, fs.constants.W_OK)
	logger.debug(`Database directory is writable: ${DB_DIR}`)
} catch (error: any) {
	logger.error(`Database directory is not writable: ${DB_DIR}`, error)
	if (DB_PATH !== ':memory:' && !process.env.VITEST) {
		throw new Error(`Database directory ${DB_DIR} is not writable: ${error.message}`)
	}
}

// Initialize database with error handling
let dbInstance: DatabaseType
try {
	dbInstance = new Database(DB_PATH)
	logger.debug(`Database initialized at: ${DB_PATH}`)
} catch (error: any) {
	logger.error(`Failed to initialize database at ${DB_PATH}:`, error)
	throw new Error(`Database initialization failed: ${error.message}`)
}

// Enable foreign keys
dbInstance.pragma('foreign_keys = ON')

// Run database migrations
// This will create the schema and apply any pending migrations
runMigrations(dbInstance)

// Prepared statements
const dbQueriesObj = {
	// Receipts
	getReceiptById: dbInstance.prepare('SELECT * FROM receipts WHERE id = ?'),
	getAllReceipts: dbInstance.prepare('SELECT * FROM receipts ORDER BY date DESC, created_at DESC'),
	getReceiptsByUser: dbInstance.prepare('SELECT * FROM receipts WHERE user_id = ? ORDER BY date DESC, created_at DESC'),
	getReceiptsByReceiptType: dbInstance.prepare('SELECT * FROM receipts WHERE receipt_type_id = ?'),
	getReceiptsByFlag: dbInstance.prepare(`
    SELECT DISTINCT r.* FROM receipts r
    INNER JOIN receipt_flags rf ON r.id = rf.receipt_id
    WHERE rf.flag_id = ?
    ORDER BY r.date DESC, r.created_at DESC
  `),
	insertReceipt: dbInstance.prepare(`
    INSERT INTO receipts (user_id, receipt_type_id, amount, vendor, provider_address, description, date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
	updateReceipt: dbInstance.prepare(`
    UPDATE receipts
    SET user_id = ?, receipt_type_id = ?, amount = ?, vendor = ?, provider_address = ?, description = ?, date = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `),
	deleteReceipt: dbInstance.prepare('DELETE FROM receipts WHERE id = ?'),

	// Users
	getAllUsers: dbInstance.prepare('SELECT * FROM users ORDER BY name'),
	getUserById: dbInstance.prepare('SELECT * FROM users WHERE id = ?'),
	getUserByName: dbInstance.prepare('SELECT * FROM users WHERE name = ?'),
	insertUser: dbInstance.prepare('INSERT INTO users (name) VALUES (?)'),
	updateUser: dbInstance.prepare('UPDATE users SET name = ? WHERE id = ?'),
	deleteUser: dbInstance.prepare('DELETE FROM users WHERE id = ?'),

	// Receipt Types
	getAllReceiptTypes: dbInstance.prepare(`
    SELECT rt.*, rtg.name as group_name, rtg.display_order as group_display_order
    FROM receipt_types rt
    LEFT JOIN receipt_type_groups rtg ON rt.group_id = rtg.id
    ORDER BY rtg.display_order, rtg.name, rt.display_order, rt.name
  `),
	getReceiptTypeById: dbInstance.prepare('SELECT * FROM receipt_types WHERE id = ?'),
	getReceiptTypeByName: dbInstance.prepare('SELECT * FROM receipt_types WHERE name = ?'),
	getReceiptTypesByGroupId: dbInstance.prepare(`
    SELECT * FROM receipt_types
    WHERE group_id = ?
    ORDER BY display_order, name
  `),
	insertReceiptType: dbInstance.prepare('INSERT INTO receipt_types (name, group_id, display_order) VALUES (?, ?, ?)'),
	updateReceiptType: dbInstance.prepare('UPDATE receipt_types SET name = ?, group_id = ?, display_order = ? WHERE id = ?'),
	updateReceiptTypeGroupId: dbInstance.prepare('UPDATE receipt_types SET group_id = ?, display_order = ? WHERE id = ?'),
	deleteReceiptType: dbInstance.prepare('DELETE FROM receipt_types WHERE id = ?'),

	// Receipt Type Groups
	getAllReceiptTypeGroups: dbInstance.prepare('SELECT * FROM receipt_type_groups ORDER BY display_order, name'),
	getReceiptTypeGroupById: dbInstance.prepare('SELECT * FROM receipt_type_groups WHERE id = ?'),
	getReceiptTypeGroupByName: dbInstance.prepare('SELECT * FROM receipt_type_groups WHERE name = ?'),
	insertReceiptTypeGroup: dbInstance.prepare('INSERT INTO receipt_type_groups (name, display_order) VALUES (?, ?)'),
	updateReceiptTypeGroup: dbInstance.prepare('UPDATE receipt_type_groups SET name = ?, display_order = ? WHERE id = ?'),
	deleteReceiptTypeGroup: dbInstance.prepare('DELETE FROM receipt_type_groups WHERE id = ?'),
	ungroupReceiptTypes: dbInstance.prepare('UPDATE receipt_types SET group_id = NULL WHERE group_id = ?'),

	// Receipt Files
	getFilesByReceiptId: dbInstance.prepare('SELECT * FROM receipt_files WHERE receipt_id = ? ORDER BY file_order'),
	getFileById: dbInstance.prepare('SELECT * FROM receipt_files WHERE id = ?'),
	insertReceiptFile: dbInstance.prepare(`
    INSERT INTO receipt_files (receipt_id, filename, original_filename, file_order)
    VALUES (?, ?, ?, ?)
  `),
	updateReceiptFilename: dbInstance.prepare('UPDATE receipt_files SET filename = ? WHERE id = ?'),
	updateReceiptFileOriginalFilename: dbInstance.prepare('UPDATE receipt_files SET original_filename = ? WHERE id = ?'),
	updateReceiptFileOptimized: dbInstance.prepare(`
    UPDATE receipt_files
    SET is_optimized = 1, optimized_at = datetime('now')
    WHERE id = ?
  `),
	resetReceiptFileOptimized: dbInstance.prepare(`
    UPDATE receipt_files
    SET is_optimized = 0, optimized_at = NULL
    WHERE id = ?
  `),
	getUnoptimizedFiles: dbInstance.prepare(`
    SELECT * FROM receipt_files
    WHERE is_optimized = 0 OR is_optimized IS NULL
    ORDER BY created_at
  `),
	getAllImageFiles: dbInstance.prepare(`
    SELECT * FROM receipt_files
    WHERE LOWER(filename) LIKE '%.jpg'
       OR LOWER(filename) LIKE '%.jpeg'
       OR LOWER(filename) LIKE '%.png'
       OR LOWER(filename) LIKE '%.webp'
    ORDER BY created_at
  `),
	deleteReceiptFile: dbInstance.prepare('DELETE FROM receipt_files WHERE id = ?'),
	deleteFilesByReceiptId: dbInstance.prepare('DELETE FROM receipt_files WHERE receipt_id = ?'),

	// Flags
	getAllFlags: dbInstance.prepare('SELECT * FROM flags ORDER BY name'),
	getFlagById: dbInstance.prepare('SELECT * FROM flags WHERE id = ?'),
	getFlagByName: dbInstance.prepare('SELECT * FROM flags WHERE name = ?'),
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

	// Vendors
	getFrequentVendors: dbInstance.prepare(`
		SELECT vendor, COUNT(*) as count
		FROM receipts
		WHERE vendor IS NOT NULL AND vendor != ''
		GROUP BY vendor
		ORDER BY count DESC, vendor ASC
	`),
}

// Export dbQueries - TypeScript can't generate declaration files for complex Statement types
// Using type assertion to allow declaration file generation
// Runtime behavior is unchanged, this only affects .d.ts generation
export const dbQueries = dbQueriesObj as Record<string, any>
export { dbInstance as db }
export default dbInstance
