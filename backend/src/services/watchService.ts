import fs from 'fs/promises'
import path from 'path'
import { logger } from '../utils/logger'
import { createReceipt, addReceiptFile, createFlag, getAllFlags } from './dbService'
import { saveReceiptFile, ensureReceiptDir, isImageFile, isPdfFile } from './fileService'
import { dbQueries } from '../db'
import { Flag } from '../models/receipt'

// Service state
let watchInterval: NodeJS.Timeout | null = null
let isScanning = false
let lastScanTime: Date | null = null
let nextScanTime: Date | null = null
let watchFolderFlagId: number | null = null

/**
 * Get watch folder path from environment variable
 */
function getWatchFolderPath(): string {
	return process.env.WATCH_FOLDER || '/data/watch'
}

/**
 * Get processed folder path
 */
function getProcessedFolderPath(): string {
	return path.join(getWatchFolderPath(), 'processed')
}

/**
 * Check if file extension is supported
 */
function isSupportedFile(filename: string): boolean {
	const ext = path.extname(filename).toLowerCase()
	return ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext)
}

/**
 * Get or create WATCH_FOLDER flag
 */
async function getOrCreateWatchFolderFlag(): Promise<number> {
	if (watchFolderFlagId !== null) {
		return watchFolderFlagId
	}

	// Try to find existing flag
	const existingFlag = dbQueries.getFlagByName.get('WATCH_FOLDER') as Flag | undefined
	if (existingFlag) {
		watchFolderFlagId = existingFlag.id
		return watchFolderFlagId
	}

	// Create new flag
	const newFlag = createFlag('WATCH_FOLDER')
	watchFolderFlagId = newFlag.id
	return watchFolderFlagId
}

/**
 * Ensure watch folder and processed folder exist
 */
async function ensureWatchFolders(): Promise<void> {
	const watchFolder = getWatchFolderPath()
	const processedFolder = getProcessedFolderPath()

	try {
		await fs.mkdir(watchFolder, { recursive: true })
		await fs.mkdir(processedFolder, { recursive: true })
	} catch (error) {
		logger.error(`Failed to create watch folders: ${error}`)
		throw error
	}
}

/**
 * Process a single receipt from files
 */
async function processReceipt(files: Array<{ path: string; name: string }>, sourceName: string): Promise<void> {
	if (files.length === 0) {
		return
	}

	try {
		// Get or create WATCH_FOLDER flag
		const flagId = await getOrCreateWatchFolderFlag()

		// Create receipt with default values
		const today = new Date().toISOString().split('T')[0]
		const receipt = createReceipt(
			{
				date: today,
				vendor: '',
				amount: 0,
				description: 'Auto-imported from watch folder',
				provider_address: '',
			},
			[flagId]
		)

		// Ensure receipt directory exists
		await ensureReceiptDir(receipt.id)

		// Get flags for filename generation
		const flags = getAllFlags().filter(f => receipt.flags.some(rf => rf.id === f.id))

		// Process each file
		for (let i = 0; i < files.length; i++) {
			const file = files[i]
			const filePath = file.path

			try {
				// Create a temporary file object that matches Express.Multer.File interface
				// We'll read the file and create a temporary copy for saveReceiptFile
				const tempDir = process.env.UPLOAD_DIR || (process.env.NODE_ENV === 'production' ? '/data/uploads' : '/tmp/medstash-uploads')
				await fs.mkdir(tempDir, { recursive: true })
				const tempFilePath = path.join(tempDir, `watch-${Date.now()}-${i}-${file.name}`)

				// Copy file to temp location
				await fs.copyFile(filePath, tempFilePath)

				// Create a mock multer file object
				// Only path and originalname are actually used by saveReceiptFile
				const mockFile = {
					fieldname: 'files',
					originalname: file.name,
					encoding: '7bit',
					mimetype: isImageFile(file.name) ? 'image/jpeg' : isPdfFile(file.name) ? 'application/pdf' : 'application/octet-stream',
					destination: tempDir,
					filename: path.basename(tempFilePath),
					path: tempFilePath,
					size: (await fs.stat(tempFilePath)).size,
					stream: null as any,
					buffer: null as any,
				} as Express.Multer.File

				// Save file to receipt storage
				const { filename, originalFilename } = await saveReceiptFile(
					mockFile,
					receipt.id,
					receipt.date,
					receipt.user,
					receipt.vendor,
					receipt.amount,
					receipt.type,
					i,
					flags
				)

				// Add file to database
				addReceiptFile(receipt.id, filename, originalFilename, i)

				logger.debug(`Processed file ${file.name} for receipt ${receipt.id}`)
			} catch (error) {
				logger.error(`Failed to process file ${file.name}:`, error)
				// Continue with other files
			}
		}

		// Move original files to processed folder
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) // YYYY-MM-DDTHH-MM-SS
		const processedSubfolder = path.join(getProcessedFolderPath(), timestamp)
		await fs.mkdir(processedSubfolder, { recursive: true })

		// Preserve source name in processed folder if it's a directory
		const finalProcessedFolder =
			sourceName && sourceName !== path.basename(files[0].path) ? path.join(processedSubfolder, sourceName) : processedSubfolder
		await fs.mkdir(finalProcessedFolder, { recursive: true })

		for (const file of files) {
			try {
				const destPath = path.join(finalProcessedFolder, file.name)
				await fs.rename(file.path, destPath)
			} catch (error) {
				logger.error(`Failed to move file ${file.name} to processed folder:`, error)
				// Try to copy instead if rename fails (e.g., across volumes)
				try {
					const destPath = path.join(finalProcessedFolder, file.name)
					await fs.copyFile(file.path, destPath)
					await fs.unlink(file.path)
				} catch (copyError) {
					logger.error(`Failed to copy file ${file.name} to processed folder:`, copyError)
				}
			}
		}

		logger.debug(`Created receipt ${receipt.id} from ${files.length} file(s) in ${sourceName}`)
	} catch (error) {
		logger.error(`Failed to process receipt from ${sourceName}:`, error)
	}
}

/**
 * Scan watch folder and process files
 */
async function scanWatchFolder(): Promise<void> {
	if (isScanning) {
		logger.debug('Scan already in progress, skipping')
		return
	}

	isScanning = true
	const watchFolder = getWatchFolderPath()

	try {
		// Ensure folders exist
		await ensureWatchFolders()

		// Read watch folder
		const entries = await fs.readdir(watchFolder, { withFileTypes: true })

		// Separate files and directories
		const rootFiles: Array<{ path: string; name: string }> = []
		const directories: Array<{ path: string; name: string }> = []

		for (const entry of entries) {
			// Skip processed folder and hidden files/directories
			if (entry.name === 'processed' || entry.name.startsWith('.')) {
				continue
			}

			const fullPath = path.join(watchFolder, entry.name)

			if (entry.isFile()) {
				if (isSupportedFile(entry.name)) {
					rootFiles.push({ path: fullPath, name: entry.name })
				} else {
					logger.debug(`Skipping unsupported file: ${entry.name}`)
				}
			} else if (entry.isDirectory()) {
				directories.push({ path: fullPath, name: entry.name })
			}
		}

		// Process root-level files (each file = one receipt)
		for (const file of rootFiles) {
			await processReceipt([file], file.name)
		}

		// Process directories (all files in directory = one receipt)
		for (const dir of directories) {
			try {
				const dirEntries = await fs.readdir(dir.path, { withFileTypes: true })
				const dirFiles: Array<{ path: string; name: string }> = []

				for (const entry of dirEntries) {
					if (entry.isFile() && isSupportedFile(entry.name)) {
						dirFiles.push({ path: path.join(dir.path, entry.name), name: entry.name })
					}
				}

				if (dirFiles.length > 0) {
					await processReceipt(dirFiles, dir.name)
				}
			} catch (error) {
				logger.error(`Failed to process directory ${dir.name}:`, error)
				// Continue with other directories
			}
		}

		lastScanTime = new Date()
		logger.debug(`Watch folder scan completed. Processed ${rootFiles.length} root file(s) and ${directories.length} directory/directories`)
	} catch (error: any) {
		// Handle missing folder gracefully
		if (error?.code === 'ENOENT') {
			logger.warn(`Watch folder ${watchFolder} does not exist. Creating it...`)
			try {
				await ensureWatchFolders()
				logger.debug(`Watch folder ${watchFolder} created successfully`)
			} catch (createError) {
				logger.error(`Failed to create watch folder: ${createError}`)
			}
		} else {
			logger.error('Error scanning watch folder:', error)
		}
	} finally {
		isScanning = false
	}
}

/**
 * Start watch service with interval-based scanning
 */
export function startWatchService(): void {
	const watchFolder = getWatchFolderPath()
	const intervalMinutes = parseInt(process.env.WATCH_INTERVAL || '30', 10)
	const intervalMs = intervalMinutes * 60 * 1000

	// Validate interval
	if (isNaN(intervalMs) || intervalMs <= 0) {
		logger.warn(`Invalid WATCH_INTERVAL: ${process.env.WATCH_INTERVAL}. Using default 30 minutes.`)
		const defaultIntervalMs = 30 * 60 * 1000
		nextScanTime = new Date(Date.now() + defaultIntervalMs)
		watchInterval = setInterval(() => {
			scanWatchFolder().catch(error => {
				logger.error('Error in watch service interval:', error)
			})
		}, defaultIntervalMs)
	} else {
		nextScanTime = new Date(Date.now() + intervalMs)
		watchInterval = setInterval(() => {
			scanWatchFolder().catch(error => {
				logger.error('Error in watch service interval:', error)
			})
		}, intervalMs)
	}

	logger.debug(`Watch service started. Watching: ${watchFolder}, Interval: ${intervalMinutes} minutes`)

	// Run initial scan
	scanWatchFolder().catch(error => {
		logger.error('Error in initial watch folder scan:', error)
	})
}

/**
 * Stop watch service
 */
export function stopWatchService(): void {
	if (watchInterval) {
		clearInterval(watchInterval)
		watchInterval = null
		nextScanTime = null
		logger.debug('Watch service stopped')
	}
}

/**
 * Get watch service status
 */
export function getWatchServiceStatus(): {
	enabled: boolean
	watchFolder: string
	interval: number
	lastScan?: string
	nextScan?: string
	isScanning: boolean
} {
	const intervalMinutes = parseInt(process.env.WATCH_INTERVAL || '30', 10)
	const intervalMs = intervalMinutes * 60 * 1000

	return {
		enabled: watchInterval !== null,
		watchFolder: getWatchFolderPath(),
		interval: intervalMs,
		lastScan: lastScanTime?.toISOString(),
		nextScan: nextScanTime?.toISOString(),
		isScanning,
	}
}

/**
 * Manually trigger a scan
 */
export async function triggerScan(): Promise<void> {
	await scanWatchFolder()
}
