import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import request from 'supertest'
import { createTestApp } from '../helpers/testServer'
import { setupTestDb, clearTestDb, createTestDbQueries } from '../helpers/testDb'
import { setupTestFiles, cleanupTestFiles } from '../helpers/testFiles'
import { createReceiptFixture, createFlagFixture } from '../helpers/fixtures'
import path from 'path'
import fs from 'fs/promises'

// Mock the db module using factory function
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
// We need to override functions that use RECEIPTS_DIR constant
vi.mock('../../src/services/fileService', async () => {
	const pathMod = await import('path')
	const fsMod = await import('fs/promises')
	const { generateReceiptFilename } = await import('../../src/utils/filename')

	// Get test receipts dir from env (set in beforeEach)
	// This function is called each time, so it reads the current env var
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

	// #region agent log
	const mockReturn = {
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
		getReceiptFilePath: (receiptId: number, filename: string) => {
			return pathMod.join(getReceiptDir(receiptId), filename)
		},
		saveReceiptFile: async (
			file: Express.Multer.File,
			receiptId: number,
			date: string,
			user: string,
			vendor: string,
			amount: number,
			type: string,
			fileOrder: number
		) => {
			await ensureReceiptDir(receiptId)
			const receiptDir = getReceiptDir(receiptId)

			const originalExt = pathMod.extname(file.originalname)
			const originalFilename = file.originalname

			const filename = generateReceiptFilename(date, user, vendor, amount, type, fileOrder, originalExt)

			const filePath = pathMod.join(receiptDir, filename)
			let optimized = false

			// Check if it's an image file (simple check to avoid calling actual module)
			const ext = pathMod.extname(originalFilename).toLowerCase()
			const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)

			if (isImage) {
				// For tests, just copy the file (skip optimization to avoid circular dependency)
				await fsMod.copyFile(file.path, filePath)
				optimized = false
				await fsMod.unlink(file.path)
			} else {
				await fsMod.copyFile(file.path, filePath)
				await fsMod.unlink(file.path)
			}

			return { filename, originalFilename, optimized }
		},
		fileExists: async (receiptId: number, filename: string) => {
			const filePath = pathMod.join(getReceiptDir(receiptId), filename)
			try {
				await fsMod.access(filePath)
				return true
			} catch {
				return false
			}
		},
		deleteReceiptFile: async (receiptId: number, filename: string) => {
			const filePath = pathMod.join(getReceiptDir(receiptId), filename)
			try {
				await fsMod.unlink(filePath)
			} catch (error) {
				console.warn(`Failed to delete file ${filePath}:`, error)
			}
		},
		deleteReceiptFiles: async (receiptId: number) => {
			const receiptDir = getReceiptDir(receiptId)
			try {
				await fsMod.rm(receiptDir, { recursive: true, force: true })
			} catch (error) {
				console.warn(`Failed to delete receipt directory ${receiptDir}:`, error)
			}
		},
		// Include other functions that might be needed
		isImageFile: (filename: string) => {
			const ext = pathMod.extname(filename).toLowerCase()
			return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
		},
		isPdfFile: (filename: string) => {
			return pathMod.extname(filename).toLowerCase() === '.pdf'
		},
	}
	return mockReturn
})

describe('Receipts API', () => {
	const app = createTestApp()
	let testDirs: { receiptsDir: string; uploadDir: string }
	let dbQueries: any

	beforeEach(async () => {
		// Set up test directories first
		testDirs = await setupTestFiles()
		// Set environment variable for fileService mock
		// The mock reads this dynamically via getTestReceiptsDir()
		process.env.RECEIPTS_DIR = testDirs.receiptsDir

		// Clear the mocked database
		const dbModule = await import('../../src/db')
		const db = dbModule.db
		dbQueries = dbModule.dbQueries
		db.exec(`
      DELETE FROM receipt_flags;
      DELETE FROM receipt_files;
      DELETE FROM receipts;
      DELETE FROM flags;
      DELETE FROM receipt_types;
      DELETE FROM users;
      DELETE FROM settings;
    `)
	})

	// Helper function to create user and receipt type, returning their IDs
	function createUserAndType(userName: string = 'Test User', typeName: string = 'doctor-visit'): { userId: number; typeId: number } {
		let user = dbQueries.getUserByName.get(userName) as { id: number } | undefined
		if (!user) {
			const userResult = dbQueries.insertUser.run(userName)
			user = dbQueries.getUserById.get(Number(userResult.lastInsertRowid)) as { id: number }
		}

		let type = dbQueries.getReceiptTypeByName.get(typeName) as { id: number } | undefined
		if (!type) {
			const typeResult = dbQueries.insertReceiptType.run(typeName)
			type = dbQueries.getReceiptTypeById.get(Number(typeResult.lastInsertRowid)) as { id: number }
		}

		return { userId: user.id, typeId: type.id }
	}

	afterEach(async () => {
		await cleanupTestFiles()
	})

	afterAll(async () => {
		// Close the database instance from the mock to prevent cleanup issues
		try {
			const dbModule = await import('../../src/db')
			if (dbModule.db && typeof dbModule.db.close === 'function') {
				dbModule.db.close()
			}
		} catch (error) {
			// Ignore errors during cleanup
		}
	})

	describe('GET /api/receipts', () => {
		it('should return empty array when no receipts exist', async () => {
			const response = await request(app).get('/api/receipts')
			expect(response.status).toBe(200)
			expect(response.body).toEqual([])
		})

		it('should return all receipts', async () => {
			// Create receipts directly in test DB
			const receipt1 = createReceiptFixture({ vendor: 'Vendor 1' })
			const receipt2 = createReceiptFixture({ vendor: 'Vendor 2' })
			const { userId, typeId } = createUserAndType(receipt1.user!, receipt1.type!)
			dbQueries.insertReceipt.run(
				userId,
				typeId,
				receipt1.amount,
				receipt1.vendor!,
				receipt1.provider_address!,
				receipt1.description!,
				receipt1.date!,
				receipt1.notes || null
			)
			dbQueries.insertReceipt.run(
				userId,
				typeId,
				receipt2.amount,
				receipt2.vendor!,
				receipt2.provider_address!,
				receipt2.description!,
				receipt2.date!,
				receipt2.notes || null
			)

			const response = await request(app).get('/api/receipts')
			expect(response.status).toBe(200)
			expect(response.body).toHaveLength(2)
		})

		it('should filter receipts by flag_id', async () => {
			// Create flag and receipts
			const flagResult = dbQueries.insertFlag.run('Test Flag', null)
			const flagId = Number(flagResult.lastInsertRowid)

			const { userId, typeId } = createUserAndType('User', 'type')
			const receipt1Result = dbQueries.insertReceipt.run(userId, typeId, 100, 'Vendor 1', 'Address', 'Description', '2024-01-15', null)
			const receipt1Id = Number(receipt1Result.lastInsertRowid)

			const receipt2Result = dbQueries.insertReceipt.run(userId, typeId, 100, 'Vendor 2', 'Address', 'Description', '2024-01-15', null)
			const receipt2Id = Number(receipt2Result.lastInsertRowid)

			dbQueries.insertReceiptFlag.run(receipt1Id, flagId)

			const response = await request(app).get('/api/receipts').query({ flag_id: flagId })
			expect(response.status).toBe(200)
			expect(response.body).toHaveLength(1)
			expect(response.body[0].id).toBe(receipt1Id)
		})
	})

	describe('GET /api/receipts/:id', () => {
		it('should return a receipt by ID', async () => {
			const receiptData = createReceiptFixture()
			const { userId, typeId } = createUserAndType(receiptData.user!, receiptData.type!)
			const result = dbQueries.insertReceipt.run(
				userId,
				typeId,
				receiptData.amount!,
				receiptData.vendor!,
				receiptData.provider_address!,
				receiptData.description!,
				receiptData.date!,
				receiptData.notes || null
			)
			const receiptId = Number(result.lastInsertRowid)

			const response = await request(app).get(`/api/receipts/${receiptId}`)
			expect(response.status).toBe(200)
			expect(response.body.id).toBe(receiptId)
			expect(response.body.vendor).toBe(receiptData.vendor)
		})

		it('should return 404 for non-existent receipt', async () => {
			const response = await request(app).get('/api/receipts/99999')
			expect(response.status).toBe(404)
			expect(response.body.error).toBe('Receipt not found')
		})
	})

	describe('POST /api/receipts', () => {
		it('should create a receipt with files', async () => {
			// Create a test file
			const testFilePath = path.join(testDirs.uploadDir, 'test.pdf')
			await fs.writeFile(testFilePath, 'test content')

			const response = await request(app)
				.post('/api/receipts')
				.field('user', 'Test User')
				.field('type', 'doctor-visit')
				.field('amount', '100.50')
				.field('vendor', 'Test Clinic')
				.field('provider_address', '123 Test St')
				.field('description', 'Test description')
				.field('date', '2024-01-15')
				.attach('files', testFilePath)

			expect(response.status).toBe(201)
			expect(response.body.id).toBeDefined()
			expect(response.body.user).toBe('Test User')
			expect(response.body.files).toHaveLength(1)
		})

		it('should return 400 if no files provided', async () => {
			const response = await request(app).post('/api/receipts').field('user', 'Test User').field('vendor', 'Test Clinic')

			expect(response.status).toBe(400)
			expect(response.body.error).toBe('At least one file is required')
		})

		it('should use defaults for optional fields', async () => {
			const testFilePath = path.join(testDirs.uploadDir, 'test.pdf')
			await fs.writeFile(testFilePath, 'test content')

			const response = await request(app).post('/api/receipts').attach('files', testFilePath)

			expect(response.status).toBe(201)
			expect(response.body.user).toBe('Unknown')
			expect(response.body.type).toBe('Other')
			expect(response.body.amount).toBe(0)
		})

		it('should create receipt with flags', async () => {
			const flagResult = dbQueries.insertFlag.run('Test Flag', null)
			const flagId = Number(flagResult.lastInsertRowid)

			const testFilePath = path.join(testDirs.uploadDir, 'test.pdf')
			await fs.writeFile(testFilePath, 'test content')

			const response = await request(app)
				.post('/api/receipts')
				.field('user', 'Test User')
				.field('vendor', 'Test Clinic')
				.field('flag_ids', JSON.stringify([flagId]))
				.attach('files', testFilePath)

			expect(response.status).toBe(201)
			expect(response.body.flags).toHaveLength(1)
			expect(response.body.flags[0].id).toBe(flagId)
		})
	})

	describe('PUT /api/receipts/:id', () => {
		it('should update a receipt', async () => {
			const receiptData = createReceiptFixture()
			const { userId, typeId } = createUserAndType(receiptData.user!, receiptData.type!)
			const result = dbQueries.insertReceipt.run(
				userId,
				typeId,
				receiptData.amount!,
				receiptData.vendor!,
				receiptData.provider_address!,
				receiptData.description!,
				receiptData.date!,
				receiptData.notes || null
			)
			const receiptId = Number(result.lastInsertRowid)

			const response = await request(app).put(`/api/receipts/${receiptId}`).send({
				vendor: 'Updated Vendor',
				amount: 200.75,
			})

			expect(response.status).toBe(200)
			expect(response.body.vendor).toBe('Updated Vendor')
			expect(response.body.amount).toBe(200.75)
		})

		it('should return 404 for non-existent receipt', async () => {
			const response = await request(app).put('/api/receipts/99999').send({ vendor: 'Test' })

			expect(response.status).toBe(404)
			expect(response.body.error).toBe('Receipt not found')
		})

		it('should update receipt flags', async () => {
			const receiptData = createReceiptFixture()
			const { userId, typeId } = createUserAndType(receiptData.user!, receiptData.type!)
			const result = dbQueries.insertReceipt.run(
				userId,
				typeId,
				receiptData.amount!,
				receiptData.vendor!,
				receiptData.provider_address!,
				receiptData.description!,
				receiptData.date!,
				receiptData.notes || null
			)
			const receiptId = Number(result.lastInsertRowid)

			const flagResult = dbQueries.insertFlag.run('Test Flag', null)
			const flagId = Number(flagResult.lastInsertRowid)

			const response = await request(app)
				.put(`/api/receipts/${receiptId}`)
				.send({
					flag_ids: [flagId],
				})

			expect(response.status).toBe(200)
			expect(response.body.flags).toHaveLength(1)
		})
	})

	describe('DELETE /api/receipts/:id', () => {
		it('should delete a receipt', async () => {
			const receiptData = createReceiptFixture()
			const { userId, typeId } = createUserAndType(receiptData.user!, receiptData.type!)
			const result = dbQueries.insertReceipt.run(
				userId,
				typeId,
				receiptData.amount!,
				receiptData.vendor!,
				receiptData.provider_address!,
				receiptData.description!,
				receiptData.date!,
				receiptData.notes || null
			)
			const receiptId = Number(result.lastInsertRowid)

			const response = await request(app).delete(`/api/receipts/${receiptId}`)

			expect(response.status).toBe(204)

			// Verify receipt is deleted
			const getResponse = await request(app).get(`/api/receipts/${receiptId}`)
			expect(getResponse.status).toBe(404)
		})

		it('should return 404 for non-existent receipt', async () => {
			const response = await request(app).delete('/api/receipts/99999')
			expect(response.status).toBe(404)
			expect(response.body.error).toBe('Receipt not found')
		})
	})

	describe('PUT /api/receipts/:id/flags', () => {
		it('should update receipt flags', async () => {
			const receiptData = createReceiptFixture()
			const { userId, typeId } = createUserAndType(receiptData.user!, receiptData.type!)
			const result = dbQueries.insertReceipt.run(
				userId,
				typeId,
				receiptData.amount!,
				receiptData.vendor!,
				receiptData.provider_address!,
				receiptData.description!,
				receiptData.date!,
				receiptData.notes || null
			)
			const receiptId = Number(result.lastInsertRowid)

			const flag1Result = dbQueries.insertFlag.run('Flag 1', null)
			const flag2Result = dbQueries.insertFlag.run('Flag 2', null)
			const flag1Id = Number(flag1Result.lastInsertRowid)
			const flag2Id = Number(flag2Result.lastInsertRowid)

			const response = await request(app)
				.put(`/api/receipts/${receiptId}/flags`)
				.send({
					flag_ids: [flag1Id, flag2Id],
				})

			expect(response.status).toBe(200)
			expect(response.body.flags).toHaveLength(2)
		})

		it('should return 400 if flag_ids is not an array', async () => {
			const receiptData = createReceiptFixture()
			const { userId, typeId } = createUserAndType(receiptData.user!, receiptData.type!)
			const result = dbQueries.insertReceipt.run(
				userId,
				typeId,
				receiptData.amount!,
				receiptData.vendor!,
				receiptData.provider_address!,
				receiptData.description!,
				receiptData.date!,
				receiptData.notes || null
			)
			const receiptId = Number(result.lastInsertRowid)

			const response = await request(app).put(`/api/receipts/${receiptId}/flags`).send({
				flag_ids: 'not-an-array',
			})

			expect(response.status).toBe(400)
			expect(response.body.error).toBe('flag_ids must be an array')
		})
	})

	describe('Input Validation', () => {
		it('should reject invalid receipt ID (non-numeric)', async () => {
			const response = await request(app).get('/api/receipts/abc')
			expect(response.status).toBe(400)
			expect(response.body.error).toContain('Invalid receipt ID')
		})

		it('should reject invalid flag_id query parameter', async () => {
			const response = await request(app).get('/api/receipts').query({ flag_id: 'not-a-number' })
			expect(response.status).toBe(400)
			expect(response.body.error).toContain('Invalid flag_id')
		})

		it('should reject invalid user_id in POST request', async () => {
			const testFilePath = path.join(testDirs.uploadDir, 'test.pdf')
			await fs.writeFile(testFilePath, 'test content')

			const response = await request(app)
				.post('/api/receipts')
				.field('user_id', 'not-a-number')
				.attach('files', testFilePath)

			expect(response.status).toBe(400)
			expect(response.body.error).toContain('Invalid user_id')
		})

		it('should reject invalid amount in POST request', async () => {
			const testFilePath = path.join(testDirs.uploadDir, 'test.pdf')
			await fs.writeFile(testFilePath, 'test content')

			const response = await request(app)
				.post('/api/receipts')
				.field('amount', 'not-a-number')
				.attach('files', testFilePath)

			expect(response.status).toBe(400)
			expect(response.body.error).toContain('Invalid amount')
		})

		it('should reject negative amount', async () => {
			const testFilePath = path.join(testDirs.uploadDir, 'test.pdf')
			await fs.writeFile(testFilePath, 'test content')

			const response = await request(app)
				.post('/api/receipts')
				.field('amount', '-100')
				.attach('files', testFilePath)

			expect(response.status).toBe(400)
			expect(response.body.error).toContain('Amount cannot be negative')
		})

		it('should reject invalid flag_ids JSON in POST request', async () => {
			const testFilePath = path.join(testDirs.uploadDir, 'test.pdf')
			await fs.writeFile(testFilePath, 'test content')

			const response = await request(app)
				.post('/api/receipts')
				.field('flag_ids', 'invalid-json')
				.attach('files', testFilePath)

			expect(response.status).toBe(400)
			expect(response.body.error).toContain('Invalid flag_ids format')
		})

		it('should reject invalid file type', async () => {
			const testFilePath = path.join(testDirs.uploadDir, 'test.txt')
			await fs.writeFile(testFilePath, 'test content')

			const response = await request(app)
				.post('/api/receipts')
				.field('vendor', 'Test')
				.attach('files', testFilePath)

			expect(response.status).toBe(400)
			expect(response.body.error).toContain('Invalid file type')
		})

		it('should reject invalid receipt ID in PUT request', async () => {
			const response = await request(app).put('/api/receipts/abc').send({})
			expect(response.status).toBe(400)
			expect(response.body.error).toContain('Invalid receipt ID')
		})

		it('should reject invalid file ID in GET file request', async () => {
			const receiptData = createReceiptFixture()
			const { userId, typeId } = createUserAndType(receiptData.user!, receiptData.type!)
			const result = dbQueries.insertReceipt.run(
				userId,
				typeId,
				receiptData.amount!,
				receiptData.vendor!,
				receiptData.provider_address!,
				receiptData.description!,
				receiptData.date!,
				receiptData.notes || null
			)
			const receiptId = Number(result.lastInsertRowid)

			const response = await request(app).get(`/api/receipts/${receiptId}/files/abc`)
			expect(response.status).toBe(400)
			expect(response.body.error).toContain('Invalid receipt ID or file ID')
		})
	})
})
