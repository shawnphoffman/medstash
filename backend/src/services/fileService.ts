import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'
import { generateReceiptFilename } from '../utils/filename'
import { ReceiptFile, Flag } from '../models/receipt'

// Get receipts directory dynamically to support test environments
function getReceiptsDir(): string {
	return process.env.RECEIPTS_DIR || '/data/receipts'
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
 * Get the directory path for a specific receipt
 */
export function getReceiptDir(receiptId: number): string {
	return path.join(getReceiptsDir(), receiptId.toString())
}

/**
 * Ensure receipt-specific directory exists
 */
export async function ensureReceiptDir(receiptId: number): Promise<string> {
	const receiptDir = getReceiptDir(receiptId)
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
	await ensureReceiptDir(receiptId)
	const receiptDir = getReceiptDir(receiptId)

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
 * Delete a receipt file from disk
 */
export async function deleteReceiptFile(receiptId: number, filename: string): Promise<void> {
	const filePath = path.join(getReceiptDir(receiptId), filename)
	try {
		await fs.unlink(filePath)
	} catch (error: any) {
		// File might not exist, that's okay - only log unexpected errors
		if (error?.code !== 'ENOENT') {
			console.warn(`Failed to delete file ${filePath}:`, error)
		}
	}
}

/**
 * Delete all files for a receipt
 */
export async function deleteReceiptFiles(receiptId: number): Promise<void> {
	const receiptDir = getReceiptDir(receiptId)
	try {
		await fs.rm(receiptDir, { recursive: true, force: true })
	} catch (error) {
		console.warn(`Failed to delete receipt directory ${receiptDir}:`, error)
	}
}

/**
 * Get file path for a receipt file
 */
export function getReceiptFilePath(receiptId: number, filename: string): string {
	return path.join(getReceiptDir(receiptId), filename)
}

/**
 * Check if file exists
 */
export async function fileExists(receiptId: number, filename: string): Promise<boolean> {
	const filePath = getReceiptFilePath(receiptId, filename)
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
	const receiptDir = getReceiptDir(receiptId)
	const renameResults: Array<{ fileId: number; oldFilename: string; newFilename: string }> = []

	for (const file of files) {
		const oldFilePath = path.join(receiptDir, file.filename)

		// Get the original extension from the original filename
		const originalExt = path.extname(file.original_filename)

		// Generate new filename with updated receipt data
		const newFilename = generateReceiptFilename(date, user, vendor, amount, type, file.file_order, originalExt, flags)

		const newFilePath = path.join(receiptDir, newFilename)

		// Only rename if the filename actually changed
		if (file.filename !== newFilename) {
			try {
				// Check if old file exists
				const oldFileExists = await fileExists(receiptId, file.filename)
				if (oldFileExists) {
					// Check if new filename already exists (shouldn't happen, but be safe)
					const newFileExists = await fileExists(receiptId, newFilename)
					if (newFileExists && oldFilePath !== newFilePath) {
						console.warn(`New filename ${newFilename} already exists, skipping rename for file ${file.id}`)
						continue
					}

					// Rename the file
					await fs.rename(oldFilePath, newFilePath)
					renameResults.push({
						fileId: file.id,
						oldFilename: file.filename,
						newFilename: newFilename,
					})
				} else {
					console.warn(`File ${file.filename} does not exist, skipping rename`)
				}
			} catch (error) {
				console.error(`Failed to rename file ${file.filename} to ${newFilename}:`, error)
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
