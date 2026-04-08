import express from 'express'
import fs from 'fs/promises'
import path from 'path'
import { dbQueries } from '../db'
import { logger } from '../utils/logger'
import { sanitizeFilename } from '../utils/filename'

const router = express.Router()

const RECEIPTS_DIR = process.env.RECEIPTS_DIR || '/data/receipts'

interface IntegrityResult {
	healthy: boolean
	missingFiles: Array<{
		receiptId: number
		fileId: number
		filename: string
		expectedPath: string
	}>
	orphanedFiles: Array<{
		path: string
		filename: string
	}>
	stats: {
		totalDbFiles: number
		totalDiskFiles: number
		missingCount: number
		orphanedCount: number
	}
}

function getReceiptDirByDate(user: string, date: string): string {
	const sanitizedUser = sanitizeFilename(user || 'unknown')
	const dateStr = date.split('T')[0]
	const parts = dateStr.split('-')
	const year = parts[0] || '2024'
	const month = (parts[1] || '01').padStart(2, '0')
	const day = (parts[2] || '01').padStart(2, '0')
	return path.join(RECEIPTS_DIR, sanitizedUser, year, month, day)
}

async function scanDirectory(dirPath: string): Promise<string[]> {
	const files: string[] = []

	async function walk(dir: string) {
		try {
			const entries = await fs.readdir(dir, { withFileTypes: true })
			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name)
				if (entry.isDirectory()) {
					await walk(fullPath)
				} else if (entry.isFile() && !entry.name.startsWith('.')) {
					files.push(fullPath)
				}
			}
		} catch {
			// Directory might not exist
		}
	}

	await walk(dirPath)
	return files
}

// GET /api/health/integrity - Scan for mismatches
router.get('/', async (_req, res) => {
	try {
		const result: IntegrityResult = {
			healthy: true,
			missingFiles: [],
			orphanedFiles: [],
			stats: {
				totalDbFiles: 0,
				totalDiskFiles: 0,
				missingCount: 0,
				orphanedCount: 0,
			},
		}

		// Step 1: Get all receipt_files records from DB
		const allReceipts = dbQueries.getAllReceipts.all() as any[]
		const dbFilePaths = new Set<string>()

		for (const receipt of allReceipts) {
			const files = dbQueries.getFilesByReceiptId.all(receipt.id) as any[]
			const user = dbQueries.getUserById.get(receipt.user_id) as any
			const userName = user?.name || 'unknown'

			for (const file of files) {
				result.stats.totalDbFiles++
				const expectedDir = getReceiptDirByDate(userName, receipt.date)
				const expectedPath = path.join(expectedDir, file.filename)
				dbFilePaths.add(expectedPath)

				// Check if file exists on disk
				try {
					await fs.access(expectedPath)
				} catch {
					// Also check old ID-based structure
					const oldPath = path.join(RECEIPTS_DIR, String(receipt.id), file.filename)
					try {
						await fs.access(oldPath)
						dbFilePaths.add(oldPath)
					} catch {
						result.missingFiles.push({
							receiptId: receipt.id,
							fileId: file.id,
							filename: file.filename,
							expectedPath,
						})
					}
				}
			}
		}

		// Step 2: Scan filesystem for all files
		const diskFiles = await scanDirectory(RECEIPTS_DIR)
		result.stats.totalDiskFiles = diskFiles.length

		// Step 3: Find orphaned files (on disk but not in DB)
		for (const diskFile of diskFiles) {
			if (!dbFilePaths.has(diskFile)) {
				result.orphanedFiles.push({
					path: diskFile,
					filename: path.basename(diskFile),
				})
			}
		}

		result.stats.missingCount = result.missingFiles.length
		result.stats.orphanedCount = result.orphanedFiles.length
		result.healthy = result.missingFiles.length === 0 && result.orphanedFiles.length === 0

		res.json(result)
	} catch (error) {
		logger.error('Error running integrity check:', error)
		res.status(500).json({ error: 'Failed to run integrity check' })
	}
})

// POST /api/health/integrity/repair - Attempt to fix mismatches
router.post('/repair', async (_req, res) => {
	try {
		const repairResult = {
			markedMissing: 0,
			movedToLostFound: 0,
			errors: [] as Array<{ file: string; error: string }>,
		}

		// Step 1: Find missing files and log them
		const allReceipts = dbQueries.getAllReceipts.all() as any[]
		for (const receipt of allReceipts) {
			const files = dbQueries.getFilesByReceiptId.all(receipt.id) as any[]
			const user = dbQueries.getUserById.get(receipt.user_id) as any
			const userName = user?.name || 'unknown'

			for (const file of files) {
				const expectedDir = getReceiptDirByDate(userName, receipt.date)
				const expectedPath = path.join(expectedDir, file.filename)

				try {
					await fs.access(expectedPath)
				} catch {
					// Check old path
					const oldPath = path.join(RECEIPTS_DIR, String(receipt.id), file.filename)
					try {
						await fs.access(oldPath)
					} catch {
						// File is truly missing — log it but don't delete DB record
						logger.warn(`Missing file for receipt ${receipt.id}: ${file.filename}`)
						repairResult.markedMissing++
					}
				}
			}
		}

		// Step 2: Handle orphaned files
		const dbFilePaths = new Set<string>()
		for (const receipt of allReceipts) {
			const files = dbQueries.getFilesByReceiptId.all(receipt.id) as any[]
			const user = dbQueries.getUserById.get(receipt.user_id) as any
			const userName = user?.name || 'unknown'

			for (const file of files) {
				const expectedDir = getReceiptDirByDate(userName, receipt.date)
				dbFilePaths.add(path.join(expectedDir, file.filename))
				dbFilePaths.add(path.join(RECEIPTS_DIR, String(receipt.id), file.filename))
			}
		}

		const diskFiles = await scanDirectory(RECEIPTS_DIR)
		const lostFoundDir = path.join(RECEIPTS_DIR, '_lost+found')

		for (const diskFile of diskFiles) {
			if (!dbFilePaths.has(diskFile) && !diskFile.includes('_lost+found')) {
				try {
					await fs.mkdir(lostFoundDir, { recursive: true })
					const destPath = path.join(lostFoundDir, `${Date.now()}_${path.basename(diskFile)}`)
					await fs.rename(diskFile, destPath)
					repairResult.movedToLostFound++
				} catch (error) {
					repairResult.errors.push({
						file: diskFile,
						error: error instanceof Error ? error.message : 'Unknown error',
					})
				}
			}
		}

		res.json(repairResult)
	} catch (error) {
		logger.error('Error running integrity repair:', error)
		res.status(500).json({ error: 'Failed to run integrity repair' })
	}
})

export default router
