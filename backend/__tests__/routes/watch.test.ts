import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { createTestApp } from '../helpers/testServer'
import { setupTestDb, clearTestDb } from '../helpers/testDb'
import { setupTestFiles, cleanupTestFiles } from '../helpers/testFiles'
import path from 'path'
import fs from 'fs/promises'

// Mock the db module
vi.mock('../../src/db', async () => {
	const { setupTestDb, createTestDbQueries } = await import('../helpers/testDb')
	const testDb = setupTestDb()
	const testQueries = createTestDbQueries(testDb)
	return {
		dbQueries: testQueries,
		db: testDb,
		default: testDb,
	}
})

// Mock fileService to use test directories
vi.mock('../../src/services/fileService', async () => {
	const pathMod = await import('path')
	const fsMod = await import('fs/promises')

	const getTestReceiptsDir = () => {
		return process.env.RECEIPTS_DIR || '/tmp/test-receipts'
	}

	const getReceiptDir = (receiptId: number) => {
		return pathMod.join(getTestReceiptsDir(), receiptId.toString())
	}

	const ensureReceiptDir = async (receiptId: number) => {
		const receiptDir = getReceiptDir(receiptId)
		try {
			await fsMod.access(receiptDir)
		} catch {
			await fsMod.mkdir(receiptDir, { recursive: true })
		}
		return receiptDir
	}

	return {
		ensureReceiptsDir: async () => {
			const dir = getTestReceiptsDir()
			try {
				await fsMod.access(dir)
			} catch {
				await fsMod.mkdir(dir, { recursive: true })
			}
		},
		getReceiptDir,
		ensureReceiptDir,
		isImageFile: (filename: string) => {
			const ext = pathMod.extname(filename).toLowerCase()
			return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
		},
		isPdfFile: (filename: string) => {
			return pathMod.extname(filename).toLowerCase() === '.pdf'
		},
		saveReceiptFile: async () => {
			return { filename: 'test.jpg', originalFilename: 'test.jpg', optimized: false }
		},
	}
})

describe('Watch Routes', () => {
	let app: Express.Application
	let watchFolder: string
	let originalEnv: NodeJS.ProcessEnv

	beforeEach(async () => {
		// Save original env
		originalEnv = { ...process.env }

		// Setup test database
		clearTestDb()

		// Create default user and receipt type that watch service expects
		const { createUser, createReceiptType } = await import('../../src/services/dbService')
		createUser('Unknown')
		createReceiptType('Other')

		// Setup test files
		const { receiptsDir } = await setupTestFiles()

		// Create watch folder
		const testDir = path.dirname(receiptsDir)
		watchFolder = path.join(testDir, 'watch')
		await fs.mkdir(watchFolder, { recursive: true })
		await fs.mkdir(path.join(watchFolder, 'processed'), { recursive: true })

		// Set environment variables
		process.env.WATCH_FOLDER = watchFolder
		process.env.WATCH_INTERVAL = '30'
		process.env.UPLOAD_DIR = path.join(testDir, 'uploads')
		await fs.mkdir(process.env.UPLOAD_DIR, { recursive: true })

		// Create test app
		app = createTestApp()
	})

	afterEach(async () => {
		// Cleanup watch folder
		try {
			await fs.rm(watchFolder, { recursive: true, force: true })
		} catch {
			// Ignore cleanup errors
		}

		// Cleanup test files
		await cleanupTestFiles()

		// Restore original env
		process.env = originalEnv

		// Stop watch service if running
		const { stopWatchService } = await import('../../src/services/watchService')
		stopWatchService()
	})

	describe('GET /api/watch/status', () => {
		it('should return watch service status', async () => {
			const { startWatchService, stopWatchService } = await import('../../src/services/watchService')
			startWatchService()

			const response = await request(app).get('/api/watch/status')

			expect(response.status).toBe(200)
			expect(response.body).toHaveProperty('enabled')
			expect(response.body).toHaveProperty('watchFolder')
			expect(response.body).toHaveProperty('interval')
			expect(response.body).toHaveProperty('isScanning')
			expect(response.body.watchFolder).toBe(watchFolder)
			expect(response.body.enabled).toBe(true)

			stopWatchService()
		})

		it('should return status when service is stopped', async () => {
			const response = await request(app).get('/api/watch/status')

			expect(response.status).toBe(200)
			expect(response.body.enabled).toBe(false)
			expect(response.body.watchFolder).toBe(watchFolder)
		})
	})

	describe('POST /api/watch/scan', () => {
		it('should trigger a manual scan', async () => {
			const { createTestImageFile } = await import('../helpers/testFiles')
			await createTestImageFile(watchFolder, 'test-receipt.jpg')

			const response = await request(app).post('/api/watch/scan')

			expect(response.status).toBe(200)
			expect(response.body).toHaveProperty('message')
			expect(response.body.message).toBe('Scan completed')
			expect(response.body).toHaveProperty('status')
			expect(response.body.status).toHaveProperty('enabled')
		})

		it('should process files during manual scan', async () => {
			const { createTestImageFile } = await import('../helpers/testFiles')
			const { getAllReceipts } = await import('../../src/services/dbService')

			await createTestImageFile(watchFolder, 'test-receipt.jpg')

			const response = await request(app).post('/api/watch/scan')

			expect(response.status).toBe(200)

			// Verify receipt was created
			const receipts = getAllReceipts()
			expect(receipts.length).toBeGreaterThan(0)
		})

		it('should handle errors gracefully', async () => {
			// Set invalid watch folder to cause error
			process.env.WATCH_FOLDER = '/nonexistent/path/that/does/not/exist'

			const response = await request(app).post('/api/watch/scan')

			// Should still return 200 (error is logged but doesn't crash)
			expect(response.status).toBe(200)
		})
	})
})
