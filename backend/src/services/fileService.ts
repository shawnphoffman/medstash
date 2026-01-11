import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'
import { generateReceiptFilename, sanitizeFilename } from '../utils/filename'
import { ReceiptFile, Flag } from '../models/receipt'
import { logger } from '../utils/logger'
import { getSetting } from './dbService'

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
 * @deprecated Use optimizeImageAdvanced() instead
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
 * Optimization options for receipt images
 */
interface OptimizationOptions {
	quality?: number // Default: 75 for JPEG
	maxWidth?: number // Default: 2000px (if set, used for both width and height)
	maxHeight?: number // Default: 2000px (if set, used for both width and height)
	preserveMetadata?: boolean // Default: true
	progressive?: boolean // Default: true for JPEG
	grayscale?: boolean | 'auto' // Default: 'auto' - detect if B&W
	force?: boolean // Default: false - if true, skip minimum size check and always optimize
}

/**
 * Optimization result
 */
interface OptimizationResult {
	optimized: boolean
	originalSize: number
	optimizedSize: number
	format: string
	dimensions?: { width: number; height: number }
	quality: number
	grayscale?: boolean
	sizeReduction?: number // Percentage reduction
	skipped?: boolean // Whether skipped because already optimized
}

/**
 * Detect if image is primarily black and white
 * Uses color variance analysis
 */
async function isBlackAndWhiteImage(inputPath: string, threshold: number = 0.1): Promise<boolean> {
	try {
		const stats = await sharp(inputPath).stats()
		const channels = stats.channels

		// Calculate color variance across RGB channels
		// For a B&W image, all channels should have similar values
		if (channels.length >= 3) {
			const r = channels[0]
			const g = channels[1]
			const b = channels[2]

			// Calculate average values
			const rMean = r.mean
			const gMean = g.mean
			const bMean = b.mean

			// Calculate variance between channels
			const variance = (Math.abs(rMean - gMean) + Math.abs(rMean - bMean) + Math.abs(gMean - bMean)) / 3

			// Normalize variance (0-1 scale, approximate)
			const normalizedVariance = variance / 255

			return normalizedVariance < threshold
		}
		return false
	} catch (error) {
		logger.debug('Failed to detect B&W image, assuming color:', error)
		return false
	}
}

/**
 * Advanced image optimization for receipt images
 * Optimizes JPEG/PNG with receipt-specific settings (text legibility focus)
 */
export async function optimizeImageAdvanced(
	inputPath: string,
	outputPath: string,
	fileId?: number,
	options?: OptimizationOptions
): Promise<OptimizationResult> {
	const startTime = Date.now()

	// Load configuration from environment
	const quality = options?.quality ?? parseInt(process.env.IMAGE_QUALITY || '75', 10)
	const maxDimension = options?.maxWidth ?? options?.maxHeight ?? parseInt(process.env.IMAGE_MAX_DIMENSION || '2000', 10)
	const maxWidth = maxDimension
	const maxHeight = maxDimension
	// Default to false (strip metadata) for better compression unless explicitly requested
	const preserveMetadata = options?.preserveMetadata ?? process.env.IMAGE_PRESERVE_METADATA === 'true'
	const progressive = options?.progressive ?? process.env.IMAGE_USE_PROGRESSIVE_JPEG !== 'false'
	const grayscaleMode = options?.grayscale ?? (process.env.IMAGE_AUTO_GRAYSCALE !== 'false' ? 'auto' : false)
	const grayscaleThreshold = parseFloat(process.env.IMAGE_GRAYSCALE_THRESHOLD || '0.1')
	const force = options?.force ?? false

	// Check if file is already optimized (if fileId provided and not forcing)
	// Skip this check if force=true to allow re-optimization
	if (!force && fileId !== undefined) {
		try {
			const dbQueries = getDbQueries()
			if (dbQueries) {
				const file = dbQueries.getFileById.get(fileId) as any
				if (file?.is_optimized) {
					logger.debug(`File ${fileId} already optimized, skipping`)
					return {
						optimized: false,
						originalSize: 0,
						optimizedSize: 0,
						format: 'unknown',
						quality: 0,
						skipped: true,
					}
				}
			}
		} catch (error) {
			logger.debug('Could not check optimization status:', error)
		}
	}

	// Get original file size
	const originalStats = await fs.stat(inputPath)
	const originalSize = originalStats.size

	// Get image metadata
	const metadata = await sharp(inputPath).metadata()
	const format = metadata.format?.toLowerCase() || 'unknown'
	const width = metadata.width || 0
	const height = metadata.height || 0

	logger.debug(`Processing file ${fileId || inputPath}: format=${format}, size=${originalSize} bytes, dimensions=${width}x${height}`)

	// Check if file is too small to optimize (unless forced)
	const minSize = parseInt(process.env.IMAGE_MIN_SIZE_TO_OPTIMIZE || '200000', 10)
	if (!force && originalSize < minSize && format === 'jpeg') {
		// For small JPEGs, just copy with minimal processing
		await fs.copyFile(inputPath, outputPath)
		return {
			optimized: false,
			originalSize,
			optimizedSize: originalSize,
			format,
			dimensions: { width, height },
			quality: 0,
			skipped: true,
		}
	}

	let image = sharp(inputPath)

	// Preserve metadata if requested (default: false for receipts to reduce file size)
	// Only preserve if explicitly requested
	if (preserveMetadata) {
		image = image.keepMetadata()
	} else {
		// Strip all metadata for better compression
		image = image.withMetadata({})
	}

	// Detect if image is B&W and convert to grayscale if needed
	let isGrayscale = false
	if (grayscaleMode === 'auto') {
		isGrayscale = await isBlackAndWhiteImage(inputPath, grayscaleThreshold)
		if (isGrayscale) {
			image = image.greyscale()
			logger.debug('Converting B&W image to grayscale')
		}
	} else if (grayscaleMode === true) {
		image = image.greyscale()
		isGrayscale = true
	}

	// Resize if dimensions exceed limits
	if (width > maxWidth || height > maxHeight) {
		image = image.resize(maxWidth, maxHeight, {
			fit: 'inside',
			withoutEnlargement: true,
			kernel: sharp.kernel.lanczos3, // High quality for text
		})
		logger.debug(`Resizing image from ${width}x${height} to max ${maxWidth}x${maxHeight}`)
	}

	// Optimize based on format
	try {
		if (format === 'jpeg' || format === 'jpg') {
			// Optimize JPEG with progressive encoding
			await image
				.jpeg({
					quality,
					progressive,
				})
				.toFile(outputPath)
		} else if (format === 'png') {
			// Convert all PNGs to JPEG (no transparency support needed)
			// This provides better compression for receipt images
			await image
				.jpeg({
					quality,
					progressive,
				})
				.toFile(outputPath)
		} else if (format === 'webp') {
			// Convert WebP to JPEG (user doesn't want WebP format)
			// This provides better compatibility and stability
			await image
				.jpeg({
					quality,
					progressive,
				})
				.toFile(outputPath)
		} else {
			// Unsupported format, just copy
			logger.warn(`Unsupported image format: ${format} for file ${fileId || inputPath}`)
			await fs.copyFile(inputPath, outputPath)
			return {
				optimized: false,
				originalSize,
				optimizedSize: originalSize,
				format,
				dimensions: { width, height },
				quality: 0,
			}
		}
	} catch (error: any) {
		// If optimization fails, don't mark as optimized
		const errorMsg = error.message || error.toString() || 'Unknown error'
		const errorDetails = error.stack ? `${errorMsg}\n${error.stack}` : errorMsg
		if (fileId !== undefined) {
			console.error(`[ERROR] Failed to optimize file ${fileId} (${inputPath}): ${errorDetails}`)
		} else {
			console.error(`[ERROR] Failed to optimize file ${inputPath}: ${errorDetails}`)
		}
		logger.error(`Image optimization failed for ${inputPath}:`, errorDetails)
		throw error // Re-throw so caller knows it failed
	}

	// Get optimized file size
	const optimizedStats = await fs.stat(outputPath)
	const optimizedSize = optimizedStats.size
	const sizeReduction = originalSize > 0 ? ((originalSize - optimizedSize) / originalSize) * 100 : 0

	// Check if optimization actually reduced file size
	// If optimized file is larger, keep the original (skip optimization)
	if (optimizedSize >= originalSize) {
		logger.debug(
			`Optimization increased file size (${originalSize} -> ${optimizedSize} bytes), keeping original for file ${fileId || inputPath}`
		)
		// Delete the larger optimized file
		await fs.unlink(outputPath)
		// Copy original to output (so caller gets the original)
		await fs.copyFile(inputPath, outputPath)
		return {
			optimized: false,
			originalSize,
			optimizedSize: originalSize,
			format: format === 'png' || format === 'webp' ? 'jpeg' : format,
			dimensions: { width, height },
			quality: 0,
			skipped: true,
		}
	}

	// Optimization was successful and reduced file size
	const optimized = true

	// Mark file as optimized in database if fileId provided
	// Only mark if optimization was successful (don't mark on errors)
	if (fileId !== undefined && optimized) {
		try {
			const dbQueries = getDbQueries()
			if (dbQueries) {
				dbQueries.updateReceiptFileOptimized.run(fileId)
				logger.debug(`Marked file ${fileId} as optimized`)
			}
		} catch (error) {
			logger.warn(`Failed to mark file ${fileId} as optimized:`, error)
			// Don't throw - optimization succeeded, just marking failed
		}
	}

	const duration = Date.now() - startTime
	logger.debug(`Optimized image: ${originalSize} -> ${optimizedSize} bytes (${sizeReduction.toFixed(1)}% reduction) in ${duration}ms`)

	// Determine final format (PNGs and WebP are converted to JPEG)
	let finalFormat = format === 'png' || format === 'webp' ? 'jpeg' : format

	return {
		optimized,
		originalSize,
		optimizedSize,
		format: finalFormat,
		dimensions: { width, height },
		quality,
		grayscale: isGrayscale,
		sizeReduction,
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
 * Check if image optimization is enabled
 * Defaults to true if setting is not set
 */
export function isImageOptimizationEnabled(): boolean {
	try {
		const setting = getSetting('imageOptimizationEnabled')
		if (setting === null) {
			// Default to enabled if not set
			return true
		}
		// Parse JSON boolean value
		try {
			return JSON.parse(setting) === true
		} catch {
			// If parsing fails, treat as string
			return setting === 'true'
		}
	} catch (error) {
		// If there's any error, default to enabled
		logger.debug('Error checking image optimization setting, defaulting to enabled:', error)
		return true
	}
}

/**
 * Check if file is a PDF
 */
export function isPdfFile(filename: string): boolean {
	return path.extname(filename).toLowerCase() === '.pdf'
}

/**
 * Mark a receipt file as optimized in the database
 */
export async function markFileAsOptimized(receiptId: number, filename: string): Promise<void> {
	try {
		const dbQueries = getDbQueries()
		if (dbQueries) {
			const files = dbQueries.getFilesByReceiptId.all(receiptId) as any[]
			const file = files.find((f: any) => f.filename === filename)
			if (file) {
				dbQueries.updateReceiptFileOptimized.run(file.id)
				logger.debug(`Marked file ${file.id} (${filename}) as optimized`)
			}
		}
	} catch (error) {
		logger.debug('Could not mark file as optimized:', error)
	}
}

/**
 * Process and save uploaded file
 * Returns the final filename and whether it was optimized
 * Note: Call markFileAsOptimized() after addReceiptFile() if optimized is true
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

	// Generate filename (always includes [{receiptId}-{index}] before extension)
	const filename = generateReceiptFilename(date, user, vendor, amount, type, fileOrder, originalExt, receiptId, flags)

	const filePath = path.join(receiptDir, filename)

	let optimized = false

	// Optimize if it's an image and optimization is enabled
	if (isImageFile(originalFilename) && isImageOptimizationEnabled()) {
		try {
			// Use advanced optimization (no fileId yet, will mark after DB insert)
			const result = await optimizeImageAdvanced(file.path, filePath)
			optimized = result.optimized && !result.skipped

			// Delete temporary file
			await fs.unlink(file.path)
		} catch (error) {
			logger.warn('Image optimization failed, using original:', error)
			// If optimization fails, just copy the original
			await fs.copyFile(file.path, filePath)
			await fs.unlink(file.path)
		}
	} else {
		// For PDFs and other files, or if optimization is disabled, copy then delete (can't use rename across volumes in Docker)
		await fs.copyFile(file.path, filePath)
		await fs.unlink(file.path)
	}

	return { filename, originalFilename, optimized }
}

/**
 * Replace an existing file with a new one, keeping the same filename
 * This is used when replacing missing files
 * Resets optimization status since it's a new file
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

	// Reset optimization status since this is a new file
	try {
		const dbQueries = getDbQueries()
		if (dbQueries) {
			const files = dbQueries.getFilesByReceiptId.all(receiptId) as any[]
			const fileRecord = files.find((f: any) => f.filename === existingFilename)
			if (fileRecord) {
				dbQueries.resetReceiptFileOptimized.run(fileRecord.id)
				logger.debug(`Reset optimization status for file ${fileRecord.id} (${existingFilename})`)
			}
		}
	} catch (error) {
		logger.debug('Could not reset optimization status:', error)
	}

	// Optimize if it's an image and optimization is enabled
	if (isImageFile(originalFilename) && isImageOptimizationEnabled()) {
		try {
			// Get file ID for optimization tracking
			let fileId: number | undefined
			try {
				const dbQueries = getDbQueries()
				if (dbQueries) {
					const files = dbQueries.getFilesByReceiptId.all(receiptId) as any[]
					const fileRecord = files.find((f: any) => f.filename === existingFilename)
					if (fileRecord) {
						fileId = fileRecord.id
					}
				}
			} catch (error) {
				logger.debug('Could not get file ID for optimization:', error)
			}

			const result = await optimizeImageAdvanced(file.path, filePath, fileId)
			optimized = result.optimized && !result.skipped

			// Delete temporary file
			await fs.unlink(file.path)
		} catch (error) {
			logger.warn('Image optimization failed, using original:', error)
			// If optimization fails, just copy the original
			await fs.copyFile(file.path, filePath)
			await fs.unlink(file.path)
		}
	} else {
		// For PDFs and other files, or if optimization is disabled, copy then delete (can't use rename across volumes in Docker)
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

		// Generate new filename with updated receipt data (always includes [{receiptId}-{index}] before extension)
		const newFilename = generateReceiptFilename(date, user, vendor, amount, type, file.file_order, originalExt, receiptId, flags)

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
	const receiptMap = new Map<string, Array<(typeof receipts)[0]>>()
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

/**
 * Optimize all unoptimized images in the database
 * Returns statistics about the optimization process
 */
export async function optimizeExistingImages(options?: { batchSize?: number; maxConcurrent?: number }): Promise<{
	total: number
	optimized: number
	skipped: number
	errors: Array<{ fileId: number; error: string }>
	duration: number
}> {
	const startTime = Date.now()
	const batchSize = options?.batchSize ?? 10
	const maxConcurrent = options?.maxConcurrent ?? 3

	const results = {
		total: 0,
		optimized: 0,
		skipped: 0,
		errors: [] as Array<{ fileId: number; error: string }>,
		duration: 0,
	}

	try {
		const dbQueries = getDbQueries()
		if (!dbQueries) {
			throw new Error('Database queries not available')
		}

		// Get all unoptimized image files
		const unoptimizedFiles = dbQueries.getUnoptimizedFiles.all() as Array<{
			id: number
			receipt_id: number
			filename: string
			original_filename: string
		}>

		results.total = unoptimizedFiles.length

		if (unoptimizedFiles.length === 0) {
			results.duration = Date.now() - startTime
			return results
		}

		logger.debug(`Found ${unoptimizedFiles.length} unoptimized files to process`)

		// Get receipt information for each file
		const { getReceiptById } = await import('./dbService')

		// Process files in batches
		for (let i = 0; i < unoptimizedFiles.length; i += batchSize) {
			const batch = unoptimizedFiles.slice(i, i + batchSize)

			// Process batch with concurrency limit
			const batchPromises = batch.map(async file => {
				try {
					// Get receipt to find file path
					const receipt = getReceiptById(file.receipt_id)
					if (!receipt) {
						const errorMsg = `Receipt ${file.receipt_id} not found`
						console.error(`[ERROR] Failed to optimize file ${file.id} (${file.filename}): ${errorMsg}`)
						results.errors.push({
							fileId: file.id,
							error: errorMsg,
						})
						return
					}

					// Get file path
					const receiptDir = getReceiptDirByDate(receipt.user || 'unknown', receipt.date)
					const filePath = path.join(receiptDir, file.filename)

					// Check if file exists
					try {
						await fs.access(filePath)
					} catch (accessError: any) {
						// File doesn't exist - mark as optimized (skip) so it doesn't appear in future runs
						// This is not an error - file may have been deleted manually
						dbQueries.updateReceiptFileOptimized.run(file.id)
						logger.debug(`Skipped missing file ${file.id} (${file.filename}): file not found`)
						results.skipped++
						return
					}

					// Check if it's an image
					if (!isImageFile(file.filename)) {
						// Not an image, mark as optimized (skip)
						dbQueries.updateReceiptFileOptimized.run(file.id)
						results.skipped++
						return
					}

					// Optimize the image (use temp file for in-place optimization)
					const tempFilePath = `${filePath}.tmp.${Date.now()}`
					try {
						const result = await optimizeImageAdvanced(filePath, tempFilePath, file.id)
						logger.debug(
							`Optimization result for file ${file.id}: optimized=${result.optimized}, skipped=${result.skipped}, format=${result.format}`
						)

						if (result.optimized && !result.skipped) {
							// Replace original with optimized version
							await fs.rename(tempFilePath, filePath)
							results.optimized++
							logger.debug(
								`Optimized file ${file.id}: ${result.originalSize} -> ${result.optimizedSize} bytes (${result.sizeReduction?.toFixed(
									1
								)}% reduction)`
							)
						} else if (result.skipped) {
							// Clean up temp file if it was created
							try {
								await fs.unlink(tempFilePath)
							} catch {
								// Ignore cleanup errors
							}
							results.skipped++
							logger.debug(`Skipped file ${file.id} (already optimized or too small)`)
						} else {
							// Clean up temp file
							try {
								await fs.unlink(tempFilePath)
							} catch {
								// Ignore cleanup errors
							}
							const errorMsg = `Optimization returned false (optimized=${result.optimized}, skipped=${result.skipped}, format=${result.format})`
							console.error(`[ERROR] Failed to optimize file ${file.id} (${file.filename}): ${errorMsg}`)
							logger.error(`Failed to optimize file ${file.id}: ${errorMsg}`)
							results.errors.push({
								fileId: file.id,
								error: errorMsg,
							})
						}
					} catch (optError: any) {
						// Clean up temp file on error
						try {
							await fs.unlink(tempFilePath)
						} catch {
							// Ignore cleanup errors
						}
						throw optError
					}
				} catch (error: any) {
					const errorMessage = error.message || error.toString() || 'Unknown error'
					console.error(`[ERROR] Failed to optimize file ${file.id} (${file.filename}):`, errorMessage)
					if (error.stack) {
						console.error(`[ERROR] Stack trace for file ${file.id}:`, error.stack)
						logger.debug(`Error stack for file ${file.id}:`, error.stack)
					}
					results.errors.push({
						fileId: file.id,
						error: errorMessage,
					})
					logger.error(`Failed to optimize file ${file.id} (${file.filename}):`, errorMessage)
				}
			})

			// Process with concurrency limit
			const chunks = []
			for (let j = 0; j < batchPromises.length; j += maxConcurrent) {
				chunks.push(batchPromises.slice(j, j + maxConcurrent))
			}

			for (const chunk of chunks) {
				await Promise.all(chunk)
			}

			logger.debug(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(unoptimizedFiles.length / batchSize)}`)
		}

		results.duration = Date.now() - startTime
		logger.debug(
			`Batch optimization completed: ${results.optimized} optimized, ${results.skipped} skipped, ${results.errors.length} errors in ${results.duration}ms`
		)

		return results
	} catch (error: any) {
		results.duration = Date.now() - startTime
		logger.error('Error in batch optimization:', error)
		throw error
	}
}

/**
 * Re-optimize all images in the database (including already optimized ones)
 * This resets the optimization status and re-optimizes all images
 * Returns statistics about the optimization process
 */
export async function reoptimizeAllImages(options?: { batchSize?: number; maxConcurrent?: number }): Promise<{
	total: number
	optimized: number
	skipped: number
	errors: Array<{ fileId: number; error: string }>
	duration: number
}> {
	const startTime = Date.now()
	const batchSize = options?.batchSize ?? 10
	const maxConcurrent = options?.maxConcurrent ?? 3

	const results = {
		total: 0,
		optimized: 0,
		skipped: 0,
		errors: [] as Array<{ fileId: number; error: string }>,
		duration: 0,
	}

	try {
		const dbQueries = getDbQueries()
		if (!dbQueries) {
			throw new Error('Database queries not available')
		}

		// Get all image files (regardless of optimization status)
		const allImageFiles = dbQueries.getAllImageFiles.all() as Array<{
			id: number
			receipt_id: number
			filename: string
			original_filename: string
		}>

		// Filter to only actual image files (double-check with isImageFile)
		const imageFiles = allImageFiles.filter(file => isImageFile(file.filename))

		results.total = imageFiles.length

		if (imageFiles.length === 0) {
			results.duration = Date.now() - startTime
			return results
		}

		logger.debug(`Found ${imageFiles.length} image files to re-optimize`)

		// Reset optimization status for all files
		for (const file of imageFiles) {
			dbQueries.resetReceiptFileOptimized.run(file.id)
		}

		logger.debug(`Reset optimization status for ${imageFiles.length} files`)

		// Get receipt information for each file
		const { getReceiptById } = await import('./dbService')

		// Process files in batches
		for (let i = 0; i < imageFiles.length; i += batchSize) {
			const batch = imageFiles.slice(i, i + batchSize)

			// Process batch with concurrency limit
			const batchPromises = batch.map(async file => {
				try {
					// Get receipt to find file path
					const receipt = getReceiptById(file.receipt_id)
					if (!receipt) {
						const errorMsg = `Receipt ${file.receipt_id} not found`
						console.error(`[ERROR] Failed to optimize file ${file.id} (${file.filename}): ${errorMsg}`)
						results.errors.push({
							fileId: file.id,
							error: errorMsg,
						})
						return
					}

					// Get file path
					const receiptDir = getReceiptDirByDate(receipt.user || 'unknown', receipt.date)
					const filePath = path.join(receiptDir, file.filename)

					// Check if file exists
					try {
						await fs.access(filePath)
					} catch (accessError: any) {
						// File doesn't exist - mark as optimized (skip) so it doesn't appear in future runs
						// This is not an error - file may have been deleted manually
						dbQueries.updateReceiptFileOptimized.run(file.id)
						logger.debug(`Skipped missing file ${file.id} (${file.filename}): file not found`)
						results.skipped++
						return
					}

					// Optimize the image (use temp file for in-place optimization)
					// Use force=true to skip minimum size check and be more aggressive
					// Use slightly lower quality (70) for re-optimization to get better compression
					const tempFilePath = `${filePath}.tmp.${Date.now()}`
					try {
						const result = await optimizeImageAdvanced(filePath, tempFilePath, file.id, {
							force: true, // Force optimization even for small files
							quality: 70, // Slightly lower quality for better compression
							preserveMetadata: false, // Strip metadata for better compression
						})
						logger.debug(
							`Optimization result for file ${file.id}: optimized=${result.optimized}, skipped=${result.skipped}, format=${result.format}`
						)

						if (result.optimized && !result.skipped) {
							// Replace original with optimized version
							await fs.rename(tempFilePath, filePath)
							results.optimized++
							logger.debug(
								`Optimized file ${file.id}: ${result.originalSize} -> ${result.optimizedSize} bytes (${result.sizeReduction?.toFixed(
									1
								)}% reduction)`
							)
						} else if (result.skipped) {
							// Clean up temp file if it was created
							try {
								await fs.unlink(tempFilePath)
							} catch {
								// Ignore cleanup errors
							}
							results.skipped++
							logger.debug(`Skipped file ${file.id} (already optimized or too small)`)
						} else {
							// Clean up temp file
							try {
								await fs.unlink(tempFilePath)
							} catch {
								// Ignore cleanup errors
							}
							const errorMsg = `Optimization returned false (optimized=${result.optimized}, skipped=${result.skipped}, format=${result.format})`
							console.error(`[ERROR] Failed to optimize file ${file.id} (${file.filename}): ${errorMsg}`)
							logger.error(`Failed to optimize file ${file.id}: ${errorMsg}`)
							results.errors.push({
								fileId: file.id,
								error: errorMsg,
							})
						}
					} catch (optError: any) {
						// Clean up temp file on error
						try {
							await fs.unlink(tempFilePath)
						} catch {
							// Ignore cleanup errors
						}
						throw optError
					}
				} catch (error: any) {
					const errorMessage = error.message || error.toString() || 'Unknown error'
					console.error(`[ERROR] Failed to optimize file ${file.id} (${file.filename}):`, errorMessage)
					if (error.stack) {
						console.error(`[ERROR] Stack trace for file ${file.id}:`, error.stack)
						logger.debug(`Error stack for file ${file.id}:`, error.stack)
					}
					results.errors.push({
						fileId: file.id,
						error: errorMessage,
					})
					logger.error(`Failed to optimize file ${file.id} (${file.filename}):`, errorMessage)
				}
			})

			// Process with concurrency limit
			const chunks = []
			for (let j = 0; j < batchPromises.length; j += maxConcurrent) {
				chunks.push(batchPromises.slice(j, j + maxConcurrent))
			}

			for (const chunk of chunks) {
				await Promise.all(chunk)
			}

			logger.debug(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(imageFiles.length / batchSize)}`)
		}

		results.duration = Date.now() - startTime
		logger.debug(
			`Re-optimization completed: ${results.optimized} optimized, ${results.skipped} skipped, ${results.errors.length} errors in ${results.duration}ms`
		)

		return results
	} catch (error: any) {
		results.duration = Date.now() - startTime
		logger.error('Error in re-optimization:', error)
		throw error
	}
}
