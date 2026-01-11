import type { Database as DatabaseType } from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { logger } from '../utils/logger'

// Resolve migrations directory
// In development: __dirname = backend/src/services, so ../../migrations = backend/migrations
// In production (compiled): __dirname = backend/dist/services, so ../../migrations = backend/migrations
// Fallback to process.cwd() if __dirname doesn't work
const MIGRATIONS_DIR = (() => {
	try {
		// Try using __dirname first (works in CommonJS/compiled JS)
		if (typeof __dirname !== 'undefined') {
			return path.join(__dirname, '../../migrations')
		}
	} catch {
		// __dirname not available (ES modules)
	}
	// Fallback to process.cwd() + migrations path
	return path.join(process.cwd(), 'migrations')
})()

/**
 * Initialize the schema_migrations table if it doesn't exist
 */
function initializeMigrationsTable(db: DatabaseType): void {
	db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

/**
 * Get list of applied migrations from the database
 */
function getAppliedMigrations(db: DatabaseType): Set<string> {
	try {
		const rows = db.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: string }>
		return new Set(rows.map(row => row.version))
	} catch (error) {
		logger.debug('No migrations table found, assuming fresh database')
		return new Set()
	}
}

/**
 * Read migration files from the migrations directory
 */
function getMigrationFiles(): string[] {
	if (!fs.existsSync(MIGRATIONS_DIR)) {
		logger.warn(`Migrations directory not found: ${MIGRATIONS_DIR}`)
		return []
	}

	const files = fs
		.readdirSync(MIGRATIONS_DIR)
		.filter(file => file.endsWith('.sql'))
		.sort()

	return files
}

/**
 * Check if a column exists in a table
 */
function columnExists(db: DatabaseType, tableName: string, columnName: string): boolean {
	try {
		const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>
		return columns.some(col => col.name === columnName)
	} catch {
		return false
	}
}

/**
 * Execute a single migration file
 */
function executeMigration(db: DatabaseType, filename: string): void {
	const filePath = path.join(MIGRATIONS_DIR, filename)
	let sql = fs.readFileSync(filePath, 'utf-8')

	logger.debug(`Executing migration: ${filename}`)

	// Handle ALTER TABLE ADD COLUMN statements - check if column exists first
	// This makes migrations more idempotent
	// Match full ALTER TABLE statements (including type and semicolon)
	const alterTableRegex = /ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(\w+)\s+[^;]+;/gi
	let match
	const statementsToSkip: string[] = []
	while ((match = alterTableRegex.exec(sql)) !== null) {
		const fullStatement = match[0]
		const tableName = match[1]
		const columnName = match[2]
		if (columnExists(db, tableName, columnName)) {
			logger.debug(`Column ${tableName}.${columnName} already exists, skipping ALTER TABLE`)
			// Mark this statement to be skipped
			statementsToSkip.push(fullStatement)
		}
	}
	// Remove skipped statements from SQL
	for (const statement of statementsToSkip) {
		sql = sql.replace(statement, `-- Column already exists, skipped: ${statement.trim()}\n`)
	}

	const transaction = db.transaction(() => {
		// Execute the migration SQL
		db.exec(sql)

		// Record the migration as applied
		db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(filename)
	})

	transaction()
	logger.debug(`Migration completed: ${filename}`)
}

/**
 * Run all pending migrations
 */
export function runMigrations(db: DatabaseType): void {
	logger.debug('Starting database migrations...')

	// Initialize migrations table
	initializeMigrationsTable(db)

	// Get applied and available migrations
	const appliedMigrations = getAppliedMigrations(db)
	const migrationFiles = getMigrationFiles()

	if (migrationFiles.length === 0) {
		logger.warn('No migration files found')
		return
	}

	// Find pending migrations
	const pendingMigrations = migrationFiles.filter(file => !appliedMigrations.has(file))

	if (pendingMigrations.length === 0) {
		logger.debug('No pending migrations')
		return
	}

	logger.debug(`Found ${pendingMigrations.length} pending migration(s)`)

	// Execute pending migrations in order
	for (const filename of pendingMigrations) {
		try {
			executeMigration(db, filename)
			logger.log(`Migration applied: ${filename}`)
		} catch (error: any) {
			logger.error(`Migration failed: ${filename}`, error)
			throw new Error(`Migration ${filename} failed: ${error.message}`)
		}
	}

	logger.log(`All migrations completed. Applied ${pendingMigrations.length} migration(s)`)
}
