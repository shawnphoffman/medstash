import Database from 'better-sqlite3'
import type { Database as DatabaseType } from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { logger } from './utils/logger'

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

// Check if migration is needed (check if users table exists)
const checkMigrationNeeded = () => {
	try {
		const result = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get()
		return !result
	} catch {
		return true
	}
}

// Migration function to convert string-based users/types to lookup tables
const migrateToLookupTables = () => {
	const transaction = dbInstance.transaction(() => {
		// Create new lookup tables
		dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS receipt_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)

		// Check if receipts table has old schema (user TEXT column)
		const receiptsInfo = dbInstance.prepare('PRAGMA table_info(receipts)').all() as Array<{
			cid: number
			name: string
			type: string
			notnull: number
			dflt_value: any
			pk: number
		}>
		const hasOldSchema = receiptsInfo.some(col => col.name === 'user' && col.type === 'TEXT')

		if (hasOldSchema) {
			// Collect all unique users from receipts
			const receiptUsers = dbInstance.prepare('SELECT DISTINCT user FROM receipts WHERE user IS NOT NULL').all() as Array<{ user: string }>
			const userNames = new Set<string>()
			receiptUsers.forEach(row => {
				if (row.user) userNames.add(row.user)
			})

			// Collect users from settings if exists
			try {
				const usersSetting = dbInstance.prepare("SELECT value FROM settings WHERE key = 'users'").get() as { value: string } | undefined
				if (usersSetting) {
					const usersArray = JSON.parse(usersSetting.value) as string[]
					usersArray.forEach(name => userNames.add(name))
				}
			} catch {
				// Settings might not exist or be invalid JSON
			}

			// Collect all unique receipt types from receipts
			const receiptTypes = dbInstance.prepare('SELECT DISTINCT type FROM receipts WHERE type IS NOT NULL').all() as Array<{ type: string }>
			const typeNames = new Set<string>()
			receiptTypes.forEach(row => {
				if (row.type) typeNames.add(row.type)
			})

			// Collect receipt types from settings if exists
			try {
				const typesSetting = dbInstance.prepare("SELECT value FROM settings WHERE key = 'receiptTypes'").get() as
					| { value: string }
					| undefined
				if (typesSetting) {
					const typesArray = JSON.parse(typesSetting.value) as string[]
					typesArray.forEach(name => typeNames.add(name))
				}
			} catch {
				// Settings might not exist or be invalid JSON
			}

			// Ensure at least one user and one type exist
			if (userNames.size === 0) {
				userNames.add('Unknown')
			}
			if (typeNames.size === 0) {
				typeNames.add('Other')
			}

			// Insert users into lookup table
			const insertUser = dbInstance.prepare('INSERT OR IGNORE INTO users (name) VALUES (?)')
			const userMap = new Map<string, number>()
			for (const userName of userNames) {
				insertUser.run(userName)
				const user = dbInstance.prepare('SELECT id FROM users WHERE name = ?').get(userName) as { id: number } | undefined
				if (user) {
					userMap.set(userName, user.id)
				}
			}

			// Insert receipt types into lookup table
			const insertType = dbInstance.prepare('INSERT OR IGNORE INTO receipt_types (name) VALUES (?)')
			const typeMap = new Map<string, number>()
			for (const typeName of typeNames) {
				insertType.run(typeName)
				const type = dbInstance.prepare('SELECT id FROM receipt_types WHERE name = ?').get(typeName) as { id: number } | undefined
				if (type) {
					typeMap.set(typeName, type.id)
				}
			}

			// Add new columns to receipts table
			dbInstance.exec(`
        ALTER TABLE receipts ADD COLUMN user_id INTEGER;
        ALTER TABLE receipts ADD COLUMN receipt_type_id INTEGER;
      `)

			// Update receipts with foreign keys
			const updateReceipt = dbInstance.prepare(`
        UPDATE receipts
        SET user_id = ?, receipt_type_id = ?
        WHERE id = ?
      `)
			const allReceipts = dbInstance.prepare('SELECT id, user, type FROM receipts').all() as Array<{
				id: number
				user: string
				type: string
			}>
			for (const receipt of allReceipts) {
				const userId = userMap.get(receipt.user) || userMap.get('Unknown')!
				const typeId = typeMap.get(receipt.type) || typeMap.get('Other')!
				updateReceipt.run(userId, typeId, receipt.id)
			}

			// Drop old columns and recreate table with new schema
			// SQLite doesn't support DROP COLUMN, so we need to recreate the table
			dbInstance.exec(`
        CREATE TABLE receipts_new (
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

        INSERT INTO receipts_new (id, user_id, receipt_type_id, amount, vendor, provider_address, description, date, notes, created_at, updated_at)
        SELECT id, user_id, receipt_type_id, amount, vendor, provider_address, description, date, notes, created_at, updated_at
        FROM receipts;

        DROP TABLE receipts;
        ALTER TABLE receipts_new RENAME TO receipts;
      `)
		}

		// Create indexes
		dbInstance.exec(`
      CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
    CREATE INDEX IF NOT EXISTS idx_receipts_receipt_type_id ON receipts(receipt_type_id);
    CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date);
    CREATE INDEX IF NOT EXISTS idx_receipt_files_receipt_id ON receipt_files(receipt_id);
    CREATE INDEX IF NOT EXISTS idx_receipt_flags_receipt_id ON receipt_flags(receipt_id);
    CREATE INDEX IF NOT EXISTS idx_receipt_flags_flag_id ON receipt_flags(flag_id);
    CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
    CREATE INDEX IF NOT EXISTS idx_receipt_types_name ON receipt_types(name);
    `)
	})

	transaction()
}

// Initialize schema
dbInstance.exec(`
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

  CREATE TABLE IF NOT EXISTS receipt_type_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

// Check if groups migration is needed
const checkGroupsMigrationNeeded = () => {
	try {
		// Check if receipt_type_groups table exists
		const tableExists = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='receipt_type_groups'").get()

		if (!tableExists) {
			return true // Migration needed if table doesn't exist
		}

		// Check if receipt_types table has group_id column
		const receiptTypesInfo = dbInstance.prepare('PRAGMA table_info(receipt_types)').all() as Array<{
			cid: number
			name: string
			type: string
			notnull: number
			dflt_value: any
			pk: number
		}>
		const hasGroupId = receiptTypesInfo.some(col => col.name === 'group_id')
		const hasDisplayOrder = receiptTypesInfo.some(col => col.name === 'display_order')

		// Migration needed if group_id or display_order columns are missing
		return !hasGroupId || !hasDisplayOrder
	} catch {
		return true
	}
}

// Migration function to add receipt type groups
const migrateToGroups = () => {
	const transaction = dbInstance.transaction(() => {
		// Create receipt_type_groups table
		dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS receipt_type_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)

		// Check if receipt_types table has group_id column
		const receiptTypesInfo = dbInstance.prepare('PRAGMA table_info(receipt_types)').all() as Array<{
			cid: number
			name: string
			type: string
			notnull: number
			dflt_value: any
			pk: number
		}>
		const hasGroupId = receiptTypesInfo.some(col => col.name === 'group_id')
		const hasDisplayOrder = receiptTypesInfo.some(col => col.name === 'display_order')

		if (!hasGroupId) {
			// Add group_id column (nullable)
			dbInstance.exec(`
        ALTER TABLE receipt_types ADD COLUMN group_id INTEGER;
      `)
		}

		if (!hasDisplayOrder) {
			// Add display_order column
			dbInstance.exec(`
        ALTER TABLE receipt_types ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
      `)
		}

		// Create default group "Other Eligible Expenses" and assign existing types to it
		const existingTypes = dbInstance.prepare('SELECT * FROM receipt_types').all() as Array<{
			id: number
			name: string
		}>

		if (existingTypes.length > 0) {
			// Create default group
			const insertGroup = dbInstance.prepare('INSERT OR IGNORE INTO receipt_type_groups (name, display_order) VALUES (?, ?)')
			insertGroup.run('Other Eligible Expenses', 0)

			const defaultGroup = dbInstance.prepare('SELECT id FROM receipt_type_groups WHERE name = ?').get('Other Eligible Expenses') as
				| { id: number }
				| undefined

			if (defaultGroup) {
				// Assign all existing types to default group with display order based on alphabetical order
				const sortedTypes = [...existingTypes].sort((a, b) => a.name.localeCompare(b.name))
				const updateType = dbInstance.prepare('UPDATE receipt_types SET group_id = ?, display_order = ? WHERE id = ?')

				sortedTypes.forEach((type, index) => {
					updateType.run(defaultGroup.id, index, type.id)
				})
			}
		}

		// Add foreign key constraint (SQLite doesn't support adding foreign keys via ALTER TABLE, so we'll rely on application-level enforcement)
		// Add index on group_id
		dbInstance.exec(`
      CREATE INDEX IF NOT EXISTS idx_receipt_types_group_id ON receipt_types(group_id);
      CREATE INDEX IF NOT EXISTS idx_receipt_type_groups_display_order ON receipt_type_groups(display_order);
    `)
	})

	transaction()
}

// Run migration if needed
if (checkMigrationNeeded()) {
	migrateToLookupTables()
}

// Run groups migration if needed
if (checkGroupsMigrationNeeded()) {
	migrateToGroups()
}

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
	insertReceiptFile: dbInstance.prepare(`
    INSERT INTO receipt_files (receipt_id, filename, original_filename, file_order)
    VALUES (?, ?, ?, ?)
  `),
	updateReceiptFilename: dbInstance.prepare('UPDATE receipt_files SET filename = ? WHERE id = ?'),
	updateReceiptFileOriginalFilename: dbInstance.prepare('UPDATE receipt_files SET original_filename = ? WHERE id = ?'),
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
}

// Export dbQueries - TypeScript can't generate declaration files for complex Statement types
// Using type assertion to allow declaration file generation
// Runtime behavior is unchanged, this only affects .d.ts generation
export const dbQueries = dbQueriesObj as Record<string, any>
export { dbInstance as db }
export default dbInstance
