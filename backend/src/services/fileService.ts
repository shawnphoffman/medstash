import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'
import { generateReceiptFilename, sanitizeFilename } from '../utils/filename'
import { ReceiptFile, Flag } from '../models/receipt'
import { logger } from '../utils/logger'

// Get receipts directory dynamically to support test environments
function getReceiptsDir(): string {
	return process.env.RECEIPTS_DIR || '/data/receipts'
}

/**
 * Parse date string into year, month, day components
 * Returns padded values (month: "01"-"12", day: "01"-"31")
 * Handles invalid dates gracefully by defaulting to current date
 */
function parseDateComponents(date: string): { year: string; month: string; day: string } {
	try {
		// Extract date part from ISO string (YYYY-MM-DD)
		const dateStr = date.split('T')[0]
		const parts = dateStr.split('-')
		
		if (parts.length === 3) {
			const year = parts[0]
			const month = parts[1]?.padStart(2, '0') || '01'
			const day = parts[2]?.padStart(2, '0') || '01'
			
			// Validate year is 4 digits, month is 01-12, day is 01-31
			if (year.length === 4 && /^\d{4}$/.test(year)) {
				const monthNum = parseInt(month, 10)
				const dayNum = parseInt(day, 10)
				if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
					return { year, month, day }
				}
			}
		}
	} catch (error) {
		logger.warn(`Failed to parse date: ${date}, using current date`, error)
	}
	
	// Default to current date if parsing fails
	const now = new Date()
	return {
		year: now.getFullYear().toString(),
		month: (now.getMonth() + 1).toString().padStart(2, '0'),
		day: now.getDate().toString().padStart(2, '0'),
	}
}

/**
 * Get the directory path for a receipt based on user and date
 * Structure: {receiptsDir}/{sanitizedUser}/{year}/{month}/{day}/
 */
export function getReceiptDirByDate(user: string, date: string): string {
	const sanitizedUser = sanitizeFilename(user || 'unknown')
	const { year, month, day } = parseDateComponents(date)
	return path.join(getReceiptsDir(), sanitizedUser, year, month, day)
}

// Cache for db module to avoid repeated requires
// Use a getter function that tries multiple approaches
function getDbQueries(): any | null {
	// Try cached first
	if ((globalThis as any).__medstash_dbQueries) {
		return (globalThis as any).__medstash_dbQueries
	}
	
	try {
		// Try CommonJS require (works in most Node.js environments)
		const dbModule = require('../db')
		const queries = dbModule.dbQueries
		// Cache it globally for future calls
		;(globalThis as any).__medstash_dbQueries = queries
		return queries
	} catch (requireError) {
		// If require fails, return null
		return null
	}
}

/**
 * Get the directory path for a receipt by receiptId (backward compatibility)
 * Fetches receipt from database to get user and date
 * Note: This function is synchronous but may need to access the database.
 * In test environments, it may fall back to a default directory if the database isn't available.
 */
export function getReceiptDirByReceiptId(receiptId: number): string {
	try {
		const dbQueries = getDbQueries()
		if (!dbQueries) {
			logger.debug(`Cannot load db module synchronously for receipt ${receiptId}, using default directory`)
			return getReceiptDirByDate('unknown', new Date().toISOString().split('T')[0])
		}
		
		// Get receipt from database
		const receipt = dbQueries.getReceiptById.get(receiptId) as any
		if (!receipt) {
			logger.warn(`Receipt ${receiptId} not found, using default directory`)
			return getReceiptDirByDate('unknown', new Date().toISOString().split('T')[0])
		}
		
		// Get user name from database
		const user = dbQueries.getUserById.get(receipt.user_id) as any
		const userName = user?.name || 'unknown'
		
		return getReceiptDirByDate(userName, receipt.date)
	} catch (error) {
		// Fallback if anything goes wrong
		logger.debug(`Error getting receipt directory for ${receiptId}, using default:`, error)
		return getReceiptDirByDate('unknown', new Date().toISOString().split('T')[0])
	}
}

/**
 * Ensure receipts directory exists
 */
export async function ensureReceiptsDir(): Promise<void> {
	const receiptsDir = getReceiptsDir()
	try {
		await fs.access(receiptsDir)
	} catch {
		await fs.mkdir(receiptsDir, { recursive: true })
	}
}

/**
 * Get the directory path for a specific receipt (legacy - uses receiptId)
 * @deprecated Use getReceiptDirByDate() or getReceiptDirByReceiptId() instead
 */
export function getReceiptDir(receiptId: number): string {
	// For backward compatibility during migration, try new structure first
	return getReceiptDirByReceiptId(receiptId)
}

/**
 * Ensure receipt-specific directory exists (by user and date)
 */
export async function ensureReceiptDirByDate(user: string, date: string): Promise<string> {
	const receiptDir = getReceiptDirByDate(user, date)
	try {
		await fs.access(receiptDir)
	} catch {
		await fs.mkdir(receiptDir, { recursive: true })
	}
	return receiptDir
}

/**
 * Ensure receipt-specific directory exists (by receiptId - backward compatibility)
 */
export async function ensureReceiptDir(receiptId: number): Promise<string> {
	const receiptDir = getReceiptDirByReceiptId(receiptId)
	try {
		await fs.access(receiptDir)
	} catch {
		await fs.mkdir(receiptDir, { recursive: true })
	}
	return receiptDir
}

/**
 * Optimize image file if it's an image, otherwise return original
 * Converts JPEG/PNG to WebP at 85% quality
 */
export async function optimizeImage(inputPath: string, outputPath: string): Promise<void> {
	try {
		await sharp(inputPath).webp({ quality: 85 }).toFile(outputPath)
	} catch (error) {
		// If optimization fails, copy original
		await fs.copyFile(inputPath, outputPath)
		throw error
	}
}

/**
 * Check if file is an image that can be optimized
 */
export function isImageFile(filename: string): boolean {
	const ext = path.extname(filename).toLowerCase()
	return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
}

/**
 * Check if file is a PDF
 */
export function isPdfFile(filename: string): boolean {
	return path.extname(filename).toLowerCase() === '.pdf'
}

/**
 * Process and save uploaded file
 * Returns the final filename and whether it was optimized
 */
export async function saveReceiptFile(
	file: Express.Multer.File,
	receiptId: number,
	date: string,
	user: string,
	vendor: string,
	amount: number,
	type: string,
	fileOrder: number,
	flags?: Flag[]
): Promise<{ filename: string; originalFilename: string; optimized: boolean }> {
	await ensureReceiptDirByDate(user, date)
	const receiptDir = getReceiptDirByDate(user, date)

	const originalExt = path.extname(file.originalname)
	const originalFilename = file.originalname

	// Generate filename
	const filename = generateReceiptFilename(date, user, vendor, amount, type, fileOrder, originalExt, flags)

	const filePath = path.join(receiptDir, filename)

	let optimized = false

	// Optimize if it's an image
	if (isImageFile(originalFilename)) {
		try {
			await optimizeImage(file.path, filePath)
			optimized = true
			// Delete temporary file
			await fs.unlink(file.path)
		} catch (error) {
			// If optimization fails, just copy the original
			await fs.copyFile(file.path, filePath)
			await fs.unlink(file.path)
		}
	} else {
		// For PDFs and other files, copy then delete (can't use rename across volumes in Docker)
		await fs.copyFile(file.path, filePath)
		await fs.unlink(file.path)
	}

	return { filename, originalFilename, optimized }
}

/**
 * Replace an existing file with a new one, keeping the same filename
 * This is used when replacing missing files
 */
export async function replaceReceiptFile(
	file: Express.Multer.File,
	receiptId: number,
	existingFilename: string
): Promise<{ originalFilename: string; optimized: boolean }> {
	const { getReceiptById } = await import('./dbService')
	const receipt = getReceiptById(receiptId)
	if (!receipt) {
		throw new Error(`Receipt ${receiptId} not found`)
	}
	
	await ensureReceiptDirByDate(receipt.user || 'unknown', receipt.date)
	const receiptDir = getReceiptDirByDate(receipt.user || 'unknown', receipt.date)

	const originalFilename = file.originalname
	const filePath = path.join(receiptDir, existingFilename)

	let optimized = false

	// Optimize if it's an image
	if (isImageFile(originalFilename)) {
		try {
			await optimizeImage(file.path, filePath)
			optimized = true
			// Delete temporary file
			await fs.unlink(file.path)
		} catch (error) {
			// If optimization fails, just copy the original
			await fs.copyFile(file.path, filePath)
			await fs.unlink(file.path)
		}
	} else {
		// For PDFs and other files, copy then delete (can't use rename across volumes in Docker)
		await fs.copyFile(file.path, filePath)
		await fs.unlink(file.path)
	}

	return { originalFilename, optimized }
}

/**
 * Delete a receipt file from disk
 */
export async function deleteReceiptFile(receiptId: number, filename: string): Promise<void> {
	const { getReceiptById } = await import('./dbService')
	const receipt = getReceiptById(receiptId)
	if (!receipt) {
		logger.warn(`Receipt ${receiptId} not found, cannot delete file`)
		return
	}
	
	const receiptDir = getReceiptDirByDate(receipt.user || 'unknown', receipt.date)
	const filePath = path.join(receiptDir, filename)
	try {
		await fs.unlink(filePath)
	} catch (error: any) {
		// File might not exist, that's okay - only log unexpected errors
		if (error?.code !== 'ENOENT') {
			logger.warn(`Failed to delete file ${filePath}:`, error)
		}
	}
}

/**
 * Delete all files for a receipt
 * Note: With the new structure, files are in date-based directories shared by multiple receipts.
 * This function only deletes files that belong to this specific receipt.
 */
export async function deleteReceiptFiles(receiptId: number): Promise<void> {
	const { getReceiptById } = await import('./dbService')
	const receipt = getReceiptById(receiptId)
	if (!receipt) {
		logger.warn(`Receipt ${receiptId} not found, cannot delete files`)
		return
	}
	
	const receiptDir = getReceiptDirByDate(receipt.user || 'unknown', receipt.date)
	
	// Delete all files for this receipt
	for (const file of receipt.files) {
		const filePath = path.join(receiptDir, file.filename)
		try {
			await fs.unlink(filePath)
		} catch (error: any) {
			if (error?.code !== 'ENOENT') {
				logger.warn(`Failed to delete file ${filePath}:`, error)
			}
		}
	}
	
	// Try to remove the directory if it's empty (but don't fail if it's not)
	try {
		const entries = await fs.readdir(receiptDir)
		if (entries.length === 0) {
			await fs.rmdir(receiptDir)
		}
	} catch (error) {
		// Directory might not be empty or might not exist, that's fine
	}
}

/**
 * Get file path for a receipt file (by receiptId)
 */
export function getReceiptFilePath(receiptId: number, filename: string): string {
	const receiptDir = getReceiptDirByReceiptId(receiptId)
	return path.join(receiptDir, filename)
}

/**
 * Get file path for a receipt file (by user and date)
 */
export function getReceiptFilePathByDate(user: string, date: string, filename: string): string {
	const receiptDir = getReceiptDirByDate(user, date)
	return path.join(receiptDir, filename)
}

/**
 * Check if file exists
 */
export async function fileExists(receiptId: number, filename: string): Promise<boolean> {
	const { getReceiptById } = await import('./dbService')
	const receipt = getReceiptById(receiptId)
	if (!receipt) {
		return false
	}
	
	const filePath = getReceiptFilePathByDate(receipt.user || 'unknown', receipt.date, filename)
	try {
		await fs.access(filePath)
		return true
	} catch {
		return false
	}
}

/**
 * Rename all files for a receipt when receipt data changes
 * Returns array of { fileId, oldFilename, newFilename } for database updates
 * Note: If user or date changes, files will be moved to the new directory structure
 */
export async function renameReceiptFiles(
	receiptId: number,
	files: Array<{ id: number; filename: string; original_filename: string; file_order: number }>,
	date: string,
	user: string,
	vendor: string,
	amount: number,
	type: string,
	flags?: Flag[]
): Promise<Array<{ fileId: number; oldFilename: string; newFilename: string }>> {
	const { getReceiptById } = await import('./dbService')
	const oldReceipt = getReceiptById(receiptId)
	if (!oldReceipt) {
		logger.warn(`Receipt ${receiptId} not found, cannot rename files`)
		return []
	}
	
	const oldReceiptDir = getReceiptDirByDate(oldReceipt.user || 'unknown', oldReceipt.date)
	const newReceiptDir = getReceiptDirByDate(user, date)
	const renameResults: Array<{ fileId: number; oldFilename: string; newFilename: string }> = []
	
	// Ensure new directory exists
	await ensureReceiptDirByDate(user, date)

	for (const file of files) {
		const oldFilePath = path.join(oldReceiptDir, file.filename)

		// Get the original extension from the original filename
		const originalExt = path.extname(file.original_filename)

		// Generate new filename with updated receipt data
		const newFilename = generateReceiptFilename(date, user, vendor, amount, type, file.file_order, originalExt, flags)

		const newFilePath = path.join(newReceiptDir, newFilename)

		// Only rename if the filename or directory actually changed
		if (file.filename !== newFilename || oldReceiptDir !== newReceiptDir) {
			try {
				// Check if old file exists
				try {
					await fs.access(oldFilePath)
				} catch {
					logger.warn(`File ${file.filename} does not exist, skipping rename`)
					continue
				}
				
				// Check if new filename already exists (shouldn't happen, but be safe)
				try {
					await fs.access(newFilePath)
					if (oldFilePath !== newFilePath) {
						logger.warn(`New filename ${newFilename} already exists, skipping rename for file ${file.id}`)
						continue
					}
				} catch {
					// File doesn't exist, which is what we want
				}

				// Move/rename the file (fs.rename works across directories)
				await fs.rename(oldFilePath, newFilePath)
				renameResults.push({
					fileId: file.id,
					oldFilename: file.filename,
					newFilename: newFilename,
				})
			} catch (error) {
				logger.error(`Failed to rename file ${file.filename} to ${newFilename}:`, error)
				// Continue with other files even if one fails
			}
		}
	}

	return renameResults
}

/**
 * Rename all files across all receipts to match current pattern
 * Returns summary of rename operations
 */
export async function renameAllReceiptFiles(): Promise<{
	totalReceipts: number
	totalFiles: number
	renamed: number
	errors: Array<{ receiptId: number; error: string }>
}> {
	const { getAllReceipts } = await import('./dbService')
	const receipts = getAllReceipts()
	const results = {
		totalReceipts: receipts.length,
		totalFiles: 0,
		renamed: 0,
		errors: [] as Array<{ receiptId: number; error: string }>,
	}

	for (const receipt of receipts) {
		try {
			const files = receipt.files.map(f => ({
				id: f.id,
				filename: f.filename,
				original_filename: f.original_filename,
				file_order: f.file_order,
			}))

			if (files.length === 0) continue

			results.totalFiles += files.length

			const renameResults = await renameReceiptFiles(
				receipt.id,
				files,
				receipt.date,
				receipt.user,
				receipt.vendor,
				receipt.amount,
				receipt.type,
				receipt.flags
			)

			// Update database with new filenames
			const { dbQueries } = await import('../db')
			for (const result of renameResults) {
				dbQueries.updateReceiptFilename.run(result.newFilename, result.fileId)
				results.renamed++
			}
		} catch (error: any) {
			results.errors.push({
				receiptId: receipt.id,
				error: error.message || 'Unknown error',
			})
		}
	}

	return results
}

/**
 * Restore file associations by scanning filesystem and matching to receipts
 * This is useful when files exist on disk but database records are missing
 * Scans the new directory structure: {user}/{year}/{month}/{day}/
 * Returns summary of restored files
 */
export async function restoreFileAssociations(): Promise<{
	totalReceipts: number
	totalFilesFound: number
	filesRestored: number
	errors: Array<{ receiptId: number; error: string }>
}> {
	const { getAllReceipts, getReceiptById, addReceiptFile } = await import('./dbService')
	const receipts = getAllReceipts()
	const results = {
		totalReceipts: receipts.length,
		totalFilesFound: 0,
		filesRestored: 0,
		errors: [] as Array<{ receiptId: number; error: string }>,
	}

	const receiptsDir = getReceiptsDir()

	// Build a map of receipts by their directory path for quick lookup
	const receiptMap = new Map<string, Array<typeof receipts[0]>>()
	for (const receipt of receipts) {
		const dirPath = getReceiptDirByDate(receipt.user || 'unknown', receipt.date)
		if (!receiptMap.has(dirPath)) {
			receiptMap.set(dirPath, [])
		}
		receiptMap.get(dirPath)!.push(receipt)
	}

	// Recursively scan the directory structure: user/year/month/day/
	async function scanDirectory(dirPath: string, depth: number): Promise<void> {
		try {
			const entries = await fs.readdir(dirPath, { withFileTypes: true })
			
			for (const entry of entries) {
				const fullPath = path.join(dirPath, entry.name)
				
				if (entry.isDirectory()) {
					// Continue scanning subdirectories
					await scanDirectory(fullPath, depth + 1)
				} else if (entry.isFile() && !entry.name.startsWith('.')) {
					// Found a file - try to match it to a receipt
					results.totalFilesFound++
					
					// Get the directory this file is in (should be user/year/month/day/)
					const fileDir = dirPath
					const receiptsInDir = receiptMap.get(fileDir) || []
					
					// Try to find a receipt that should have this file
					// We'll match by filename pattern or try all receipts in the directory
					for (const receipt of receiptsInDir) {
						const existingFiles = receipt.files.map(f => f.filename)
						
						// Skip if file already in database
						if (existingFiles.includes(entry.name)) {
							continue
						}
						
						// Try to determine file order from filename
						let fileOrder = existingFiles.length
						const orderMatch = entry.name.match(/_(\d+)\.\w+$/)
						if (orderMatch) {
							const extractedOrder = parseInt(orderMatch[1])
							if (!isNaN(extractedOrder)) {
								fileOrder = extractedOrder
							}
						}
						
						// Use filename as original_filename (best guess)
						const originalFilename = entry.name
						
						try {
							addReceiptFile(receipt.id, entry.name, originalFilename, fileOrder)
							results.filesRestored++
							break // File matched to one receipt, move on
						} catch (error) {
							// Continue trying other receipts
						}
					}
				}
			}
		} catch (error: any) {
			if (error?.code !== 'ENOENT') {
				logger.warn(`Error scanning directory ${dirPath}:`, error)
			}
		}
	}

	try {
		await scanDirectory(receiptsDir, 0)
	} catch (error) {
		logger.error('Error reading receipts directory:', error)
	}

	return results
}

/**
 * Migrate files from old structure ({receiptId}/) to new structure ({user}/{year}/{month}/{day}/)
 * Scans all existing receipt directories (old structure) and moves files to new locations
 * Returns migration summary
 */
export async function migrateFilesToDateStructure(): Promise<{
	totalReceipts: number
	totalFiles: number
	filesMoved: number
	errors: Array<{ receiptId: number; error: string }>
}> {
	const { getAllReceipts, getReceiptById } = await import('./dbService')
	const receipts = getAllReceipts()
	const results = {
		totalReceipts: receipts.length,
		totalFiles: 0,
		filesMoved: 0,
		errors: [] as Array<{ receiptId: number; error: string }>,
	}

	const receiptsDir = getReceiptsDir()

	// Get all directories in receipts folder
	let receiptDirs: string[]
	try {
		const entries = await fs.readdir(receiptsDir, { withFileTypes: true })
		receiptDirs = entries.filter(entry => entry.isDirectory()).map(entry => entry.name)
	} catch (error) {
		logger.error('Error reading receipts directory:', error)
		return results
	}

	// Process each directory that looks like a receipt ID (numeric)
	for (const dirName of receiptDirs) {
		const receiptId = parseInt(dirName)
		if (isNaN(receiptId)) {
			// Skip non-numeric directories (these might be user directories from new structure)
			continue
		}

		// Check if receipt exists in database
		const receipt = getReceiptById(receiptId)
		if (!receipt) {
			results.errors.push({
				receiptId,
				error: 'Receipt not found in database',
			})
			continue
		}

		// Get old directory path
		const oldDir = path.join(receiptsDir, dirName)
		
		// Get new directory path
		const newDir = getReceiptDirByDate(receipt.user || 'unknown', receipt.date)
		
		// Skip if old and new directories are the same (already migrated)
		if (oldDir === newDir) {
			continue
		}

		// Ensure new directory exists
		try {
			await fs.mkdir(newDir, { recursive: true })
		} catch (error) {
			results.errors.push({
				receiptId,
				error: `Failed to create new directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
			})
			continue
		}

		// List files in old directory
		let files: string[]
		try {
			files = await fs.readdir(oldDir)
			// Filter out directories and hidden files
			files = files.filter(file => !file.startsWith('.'))
		} catch (error) {
			results.errors.push({
				receiptId,
				error: `Error reading old directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
			})
			continue
		}

		results.totalFiles += files.length

		// Move each file to new location
		for (const filename of files) {
			const oldFilePath = path.join(oldDir, filename)
			const newFilePath = path.join(newDir, filename)

			try {
				// Check if file is actually a file (not a directory)
				const stat = await fs.stat(oldFilePath)
				if (!stat.isFile()) {
					continue
				}

				// Check if file already exists in new location
				try {
					await fs.access(newFilePath)
					logger.warn(`File ${filename} already exists in new location, skipping`)
					continue
				} catch {
					// File doesn't exist in new location, proceed with move
				}

				// Move file (rename works across directories)
				await fs.rename(oldFilePath, newFilePath)
				results.filesMoved++
			} catch (error) {
				results.errors.push({
					receiptId,
					error: `Failed to move file ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`,
				})
			}
		}

		// Try to remove old directory if it's empty
		try {
			const remainingFiles = await fs.readdir(oldDir)
			if (remainingFiles.length === 0) {
				await fs.rmdir(oldDir)
			}
		} catch (error) {
			// Directory might not be empty or might not exist, that's fine
			logger.debug(`Could not remove old directory ${oldDir}:`, error)
		}
	}

	return results
}
