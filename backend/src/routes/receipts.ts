import express from 'express'
import multer from 'multer'
import path from 'path'
import { getAllReceipts, getReceiptById, createReceipt, updateReceipt, deleteReceipt, addReceiptFile } from '../services/dbService'
import {
	saveReceiptFile,
	deleteReceiptFiles,
	getReceiptFilePath,
	fileExists,
	deleteReceiptFile as deleteFile,
	replaceReceiptFile,
	migrateFilesToDateStructure,
} from '../services/fileService'
import { CreateReceiptInput, UpdateReceiptInput } from '../models/receipt'
import { dbQueries } from '../db'
import fs from 'fs/promises'
import { validateDate, validateAmount, validateVendor, validateDescription, validateProviderAddress } from '../utils/validation'
import { sanitizeString, sanitizeOptionalString } from '../utils/sanitization'
import { logger } from '../utils/logger'

const router = express.Router()

// Configure multer for file uploads
// Use /data/uploads in Docker (persistent) or /tmp/medstash-uploads in development
const uploadDir = process.env.UPLOAD_DIR || (process.env.NODE_ENV === 'production' ? '/data/uploads' : '/tmp/medstash-uploads')
const upload = multer({
	dest: uploadDir,
	limits: {
		fileSize: 50 * 1024 * 1024, // 50MB
	},
	fileFilter: (req, file, cb) => {
		// Only allow specific MIME types for security
		const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
		if (allowedMimes.includes(file.mimetype)) {
			cb(null, true)
		} else {
			cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimes.join(', ')}`))
		}
	},
})

// Ensure upload directory exists
;(async () => {
	try {
		await fs.mkdir(uploadDir, { recursive: true })
		logger.debug(`Upload directory initialized: ${uploadDir}`)
	} catch (error) {
		logger.error('Failed to create upload directory:', error)
		// Don't throw - multer will handle errors when trying to write
	}
})()

// GET /api/receipts - List all receipts
router.get('/', (req, res) => {
	try {
		let flagId: number | undefined
		if (req.query.flag_id !== undefined && req.query.flag_id !== null && req.query.flag_id !== '') {
			flagId = parseInt(req.query.flag_id as string, 10)
			if (isNaN(flagId)) {
				return res.status(400).json({ error: 'Invalid flag_id: must be a number' })
			}
		}
		const receipts = getAllReceipts(flagId)
		res.json(receipts)
	} catch (error) {
		logger.error('Error fetching receipts:', error)
		res.status(500).json({ error: 'Failed to fetch receipts' })
	}
})

// GET /api/receipts/:id - Get receipt by ID
router.get('/:id', (req, res) => {
	try {
		const id = parseInt(req.params.id, 10)
		if (isNaN(id)) {
			return res.status(400).json({ error: 'Invalid receipt ID: must be a number' })
		}
		const receipt = getReceiptById(id)
		if (!receipt) {
			return res.status(404).json({ error: 'Receipt not found' })
		}
		res.json(receipt)
	} catch (error) {
		logger.error('Error fetching receipt:', error)
		res.status(500).json({ error: 'Failed to fetch receipt' })
	}
})

// Error handler for multer errors
const handleMulterError = (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
	const isProduction = process.env.NODE_ENV === 'production'

	if (err instanceof multer.MulterError) {
		if (err.code === 'LIMIT_FILE_SIZE') {
			return res.status(400).json({ error: 'File too large. Maximum size is 50MB' })
		}
		if (err.code === 'LIMIT_FILE_COUNT') {
			return res.status(400).json({ error: 'Too many files. Maximum is 10 files' })
		}
		// Don't expose internal multer error details in production
		return res.status(400).json({
			error: isProduction ? 'File upload error' : `Upload error: ${err.message}`,
		})
	}
	if (err) {
		// Handle fileFilter errors - only expose safe error messages
		if (err.message && err.message.includes('Invalid file type')) {
			// This is a safe error message we control, so it's okay to expose
			return res.status(400).json({ error: err.message })
		}
		// Don't expose internal error details in production
		return res.status(400).json({
			error: isProduction ? 'File upload error' : err.message || 'File upload error',
		})
	}
	next()
}

// POST /api/receipts - Create receipt with files
router.post('/', upload.array('files', 10), handleMulterError, async (req: express.Request, res: express.Response) => {
	try {
		const files = req.files as Express.Multer.File[]
		const {
			user_id,
			receipt_type_id,
			user, // Legacy support
			type, // Legacy support
			amount,
			vendor,
			provider_address,
			description,
			date,
			notes,
			flag_ids,
		} = req.body

		// Validate that at least one file is provided
		if (!files || files.length === 0) {
			return res.status(400).json({
				error: 'At least one file is required',
			})
		}

		// Validate and parse numeric inputs
		let parsedUserId: number | undefined
		if (user_id !== undefined && user_id !== null && user_id !== '') {
			parsedUserId = parseInt(user_id as string, 10)
			if (isNaN(parsedUserId)) {
				return res.status(400).json({ error: 'Invalid user_id: must be a number' })
			}
		}

		let parsedReceiptTypeId: number | undefined
		if (receipt_type_id !== undefined && receipt_type_id !== null && receipt_type_id !== '') {
			parsedReceiptTypeId = parseInt(receipt_type_id as string, 10)
			if (isNaN(parsedReceiptTypeId)) {
				return res.status(400).json({ error: 'Invalid receipt_type_id: must be a number' })
			}
		}

		let parsedAmount = 0
		if (amount !== undefined && amount !== null && amount !== '') {
			parsedAmount = parseFloat(amount as string)
			if (isNaN(parsedAmount)) {
				return res.status(400).json({ error: 'Invalid amount: must be a number' })
			}
			const amountValidation = validateAmount(parsedAmount)
			if (!amountValidation.valid) {
				return res.status(400).json({ error: amountValidation.error })
			}
		}

		// Validate date format
		const dateToValidate = date || new Date().toISOString().split('T')[0]
		const dateValidation = validateDate(dateToValidate)
		if (!dateValidation.valid) {
			return res.status(400).json({ error: dateValidation.error })
		}

		// Validate string field lengths
		const vendorValidation = validateVendor(vendor)
		if (!vendorValidation.valid) {
			return res.status(400).json({ error: vendorValidation.error })
		}

		const descriptionValidation = validateDescription(description)
		if (!descriptionValidation.valid) {
			return res.status(400).json({ error: descriptionValidation.error })
		}

		const addressValidation = validateProviderAddress(provider_address)
		if (!addressValidation.valid) {
			return res.status(400).json({ error: addressValidation.error })
		}

		// Parse flag_ids safely
		let parsedFlagIds: number[] = []
		if (flag_ids !== undefined && flag_ids !== null && flag_ids !== '') {
			try {
				const parsed = typeof flag_ids === 'string' ? JSON.parse(flag_ids) : flag_ids
				if (Array.isArray(parsed)) {
					parsedFlagIds = parsed.filter((id: any) => typeof id === 'number' && !isNaN(id))
				} else {
					return res.status(400).json({ error: 'flag_ids must be an array' })
				}
			} catch (e) {
				return res.status(400).json({ error: 'Invalid flag_ids format: must be valid JSON array' })
			}
		}

		// All fields are optional except files - provide defaults
		// Sanitize all string inputs to prevent XSS attacks
		const receiptData: CreateReceiptInput = {
			user_id: parsedUserId,
			receipt_type_id: parsedReceiptTypeId,
			user: user ? sanitizeString(user) : undefined, // Legacy support
			type: type ? sanitizeString(type) : undefined, // Legacy support
			amount: parsedAmount,
			vendor: sanitizeString(vendor),
			provider_address: sanitizeString(provider_address),
			description: sanitizeString(description),
			date: dateToValidate,
			notes: sanitizeOptionalString(notes) ?? undefined,
			flag_ids: parsedFlagIds,
		}

		// Create receipt
		const receipt = createReceipt(receiptData, receiptData.flag_ids)

		// Process files
		if (files && files.length > 0) {
			for (let i = 0; i < files.length; i++) {
				const file = files[i]
				const { filename, originalFilename } = await saveReceiptFile(
					file,
					receipt.id,
					receipt.date,
					receipt.user,
					receipt.vendor,
					receipt.amount,
					receipt.type,
					i,
					receipt.flags
				)

				addReceiptFile(receipt.id, filename, originalFilename, i)
			}
		}

		// Return updated receipt with files
		const updatedReceipt = getReceiptById(receipt.id)
		res.status(201).json(updatedReceipt)
	} catch (error) {
		logger.error('Error creating receipt:', error)
		res.status(500).json({ error: 'Failed to create receipt' })
	}
})

// PUT /api/receipts/:id - Update receipt
router.put('/:id', async (req, res) => {
	try {
		const id = parseInt(req.params.id, 10)
		if (isNaN(id)) {
			return res.status(400).json({ error: 'Invalid receipt ID: must be a number' })
		}
		const {
			user_id,
			receipt_type_id,
			user, // Legacy support
			type, // Legacy support
			amount,
			vendor,
			provider_address,
			description,
			date,
			notes,
			flag_ids,
		} = req.body

		const updateData: UpdateReceiptInput = {}

		// Validate and parse user_id
		if (user_id !== undefined && user_id !== null && user_id !== '') {
			const parsedUserId = parseInt(user_id as string, 10)
			if (isNaN(parsedUserId)) {
				return res.status(400).json({ error: 'Invalid user_id: must be a number' })
			}
			updateData.user_id = parsedUserId
		}

		// Validate and parse receipt_type_id
		if (receipt_type_id !== undefined && receipt_type_id !== null && receipt_type_id !== '') {
			const parsedReceiptTypeId = parseInt(receipt_type_id as string, 10)
			if (isNaN(parsedReceiptTypeId)) {
				return res.status(400).json({ error: 'Invalid receipt_type_id: must be a number' })
			}
			updateData.receipt_type_id = parsedReceiptTypeId
		}

		if (user !== undefined) updateData.user = user // Legacy support
		if (type !== undefined) updateData.type = type // Legacy support

		// Validate and parse amount
		if (amount !== undefined && amount !== null && amount !== '') {
			const parsedAmount = parseFloat(amount as string)
			if (isNaN(parsedAmount)) {
				return res.status(400).json({ error: 'Invalid amount: must be a number' })
			}
			const amountValidation = validateAmount(parsedAmount)
			if (!amountValidation.valid) {
				return res.status(400).json({ error: amountValidation.error })
			}
			updateData.amount = parsedAmount
		}

		// Validate date format if provided
		if (date !== undefined && date !== null && date !== '') {
			const dateValidation = validateDate(date as string)
			if (!dateValidation.valid) {
				return res.status(400).json({ error: dateValidation.error })
			}
			updateData.date = date as string
		}

		// Validate string field lengths and sanitize inputs
		if (vendor !== undefined) {
			const vendorValidation = validateVendor(vendor)
			if (!vendorValidation.valid) {
				return res.status(400).json({ error: vendorValidation.error })
			}
			updateData.vendor = sanitizeString(vendor)
		}

		if (provider_address !== undefined) {
			const addressValidation = validateProviderAddress(provider_address)
			if (!addressValidation.valid) {
				return res.status(400).json({ error: addressValidation.error })
			}
			updateData.provider_address = sanitizeString(provider_address)
		}

		if (description !== undefined) {
			const descriptionValidation = validateDescription(description)
			if (!descriptionValidation.valid) {
				return res.status(400).json({ error: descriptionValidation.error })
			}
			updateData.description = sanitizeString(description)
		}
		if (notes !== undefined) {
			updateData.notes = sanitizeOptionalString(notes) ?? undefined
		}
		if (user !== undefined) {
			updateData.user = sanitizeString(user) // Legacy support
		}
		if (type !== undefined) {
			updateData.type = sanitizeString(type) // Legacy support
		}

		// Parse flag_ids safely
		let flagIds: number[] | undefined
		if (flag_ids !== undefined && flag_ids !== null && flag_ids !== '') {
			if (Array.isArray(flag_ids)) {
				flagIds = flag_ids.filter((id: any) => typeof id === 'number' && !isNaN(id))
			} else if (typeof flag_ids === 'string') {
				try {
					const parsed = JSON.parse(flag_ids)
					if (Array.isArray(parsed)) {
						flagIds = parsed.filter((id: any) => typeof id === 'number' && !isNaN(id))
					} else {
						return res.status(400).json({ error: 'flag_ids must be an array' })
					}
				} catch (e) {
					return res.status(400).json({ error: 'Invalid flag_ids format: must be valid JSON array' })
				}
			} else {
				return res.status(400).json({ error: 'flag_ids must be an array or JSON string' })
			}
		}

		const receipt = await updateReceipt(id, updateData, flagIds)
		if (!receipt) {
			return res.status(404).json({ error: 'Receipt not found' })
		}

		res.json(receipt)
	} catch (error) {
		logger.error('Error updating receipt:', error)
		res.status(500).json({ error: 'Failed to update receipt' })
	}
})

// DELETE /api/receipts/:id - Delete receipt
router.delete('/:id', async (req, res) => {
	try {
		const id = parseInt(req.params.id, 10)
		if (isNaN(id)) {
			return res.status(400).json({ error: 'Invalid receipt ID: must be a number' })
		}
		const deleted = deleteReceipt(id)
		if (!deleted) {
			return res.status(404).json({ error: 'Receipt not found' })
		}

		// Delete files from filesystem
		await deleteReceiptFiles(id)

		res.status(204).send()
	} catch (error) {
		logger.error('Error deleting receipt:', error)
		res.status(500).json({ error: 'Failed to delete receipt' })
	}
})

// POST /api/receipts/:id/files - Add files to existing receipt
router.post('/:id/files', upload.array('files', 10), handleMulterError, async (req: express.Request, res: express.Response) => {
	try {
		const id = parseInt(req.params.id, 10)
		if (isNaN(id)) {
			return res.status(400).json({ error: 'Invalid receipt ID: must be a number' })
		}
		const receipt = getReceiptById(id)
		if (!receipt) {
			return res.status(404).json({ error: 'Receipt not found' })
		}

		const files = req.files as Express.Multer.File[]
		if (!files || files.length === 0) {
			return res.status(400).json({ error: 'No files provided' })
		}

		// Allow receipt data to be overridden from request body (for updated values)
		// This ensures files are named with the latest receipt data
		const date = req.body.date || receipt.date
		const user = req.body.user || receipt.user // Already resolved to name in getReceiptById
		const vendor = req.body.vendor || receipt.vendor
		let parsedAmount = receipt.amount
		if (req.body.amount !== undefined && req.body.amount !== null && req.body.amount !== '') {
			parsedAmount = parseFloat(req.body.amount)
			if (isNaN(parsedAmount)) {
				return res.status(400).json({ error: 'Invalid amount: must be a number' })
			}
			if (parsedAmount < 0) {
				return res.status(400).json({ error: 'Amount cannot be negative' })
			}
		}
		const amount = parsedAmount
		const type = req.body.type || receipt.type // Already resolved to name in getReceiptById

		const existingFiles = receipt.files
		let fileOrder = existingFiles.length

		for (const file of files) {
			const { filename, originalFilename } = await saveReceiptFile(
				file,
				receipt.id,
				date,
				user,
				vendor,
				amount,
				type,
				fileOrder,
				receipt.flags
			)

			addReceiptFile(receipt.id, filename, originalFilename, fileOrder)
			fileOrder++
		}

		const updatedReceipt = getReceiptById(id)
		res.json(updatedReceipt)
	} catch (error) {
		logger.error('Error adding files to receipt:', error)
		res.status(500).json({ error: 'Failed to add files to receipt' })
	}
})

// GET /api/receipts/:id/files/:fileId - Download file
router.get('/:id/files/:fileId', async (req, res) => {
	try {
		const receiptId = parseInt(req.params.id, 10)
		const fileId = parseInt(req.params.fileId, 10)
		if (isNaN(receiptId) || isNaN(fileId)) {
			return res.status(400).json({ error: 'Invalid receipt ID or file ID: must be numbers' })
		}

		const receipt = getReceiptById(receiptId)
		if (!receipt) {
			return res.status(404).json({ error: 'Receipt not found' })
		}

		const file = receipt.files.find(f => f.id === fileId)
		if (!file) {
			return res.status(404).json({ error: 'File not found' })
		}

		// Validate filename to prevent path traversal attacks
		if (file.filename.includes('..') || path.isAbsolute(file.filename) || file.filename.includes('/') || file.filename.includes('\\')) {
			return res.status(400).json({ error: 'Invalid filename: path traversal detected' })
		}

		const filePath = getReceiptFilePath(receiptId, file.filename)
		const exists = await fileExists(receiptId, file.filename)

		if (!exists) {
			return res.status(404).json({
				error: 'File not found on disk. The file may have been deleted or moved.',
			})
		}

		// Check if this is a preview request (for inline display) or download
		const isPreview = req.query.preview === 'true'
		const isPdf = file.original_filename.toLowerCase().endsWith('.pdf')
		const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.original_filename)

		// For previews (PDFs and images), serve inline; otherwise download
		try {
			if (isPreview || isPdf || isImage) {
				res.setHeader('Content-Disposition', `inline; filename="${file.original_filename}"`)
				res.sendFile(path.resolve(filePath), err => {
					if (err) {
						if (!res.headersSent) {
							logger.error('Error sending file:', err)
							res.status(500).json({
								error: 'Failed to retrieve file. The file may be corrupted or inaccessible.',
							})
						}
					}
				})
			} else {
				res.download(filePath, file.original_filename, err => {
					if (err) {
						if (!res.headersSent) {
							logger.error('Error downloading file:', err)
							res.status(500).json({
								error: 'Failed to download file. The file may be corrupted or inaccessible.',
							})
						}
					}
				})
			}
		} catch (sendError: any) {
			// Handle errors from sendFile/download that occur synchronously
			if (!res.headersSent) {
				logger.error('Error sending file:', sendError)
				res.status(500).json({
					error: 'Failed to retrieve file. The file may be corrupted or inaccessible.',
				})
			}
		}
	} catch (error) {
		logger.error('Error downloading file:', error)
		if (!res.headersSent) {
			res.status(500).json({ error: 'Failed to download file' })
		}
	}
})

// DELETE /api/receipts/:id/files/:fileId - Delete a file from receipt
router.delete('/:id/files/:fileId', async (req, res) => {
	try {
		const receiptId = parseInt(req.params.id, 10)
		const fileId = parseInt(req.params.fileId, 10)
		if (isNaN(receiptId) || isNaN(fileId)) {
			return res.status(400).json({ error: 'Invalid receipt ID or file ID: must be numbers' })
		}

		const receipt = getReceiptById(receiptId)
		if (!receipt) {
			return res.status(404).json({ error: 'Receipt not found' })
		}

		const file = receipt.files.find(f => f.id === fileId)
		if (!file) {
			return res.status(404).json({ error: 'File not found' })
		}

		// Delete from database
		dbQueries.deleteReceiptFile.run(fileId)

		// Delete from filesystem
		await deleteFile(receiptId, file.filename)

		const updatedReceipt = getReceiptById(receiptId)
		res.json(updatedReceipt)
	} catch (error) {
		logger.error('Error deleting file:', error)
		res.status(500).json({ error: 'Failed to delete file' })
	}
})

// PUT /api/receipts/:id/files/:fileId - Replace a file
router.put('/:id/files/:fileId', upload.single('file'), handleMulterError, async (req: express.Request, res: express.Response) => {
	try {
		const receiptId = parseInt(req.params.id, 10)
		const fileId = parseInt(req.params.fileId, 10)
		if (isNaN(receiptId) || isNaN(fileId)) {
			return res.status(400).json({ error: 'Invalid receipt ID or file ID: must be numbers' })
		}

		const receipt = getReceiptById(receiptId)
		if (!receipt) {
			return res.status(404).json({ error: 'Receipt not found' })
		}

		const file = receipt.files.find(f => f.id === fileId)
		if (!file) {
			return res.status(404).json({ error: 'File not found' })
		}

		if (!req.file) {
			return res.status(400).json({ error: 'No file provided' })
		}

		// Delete old file from disk (if it exists)
		await deleteFile(receiptId, file.filename)

		// Replace with new file, keeping the same filename
		const { originalFilename } = await replaceReceiptFile(req.file, receiptId, file.filename)

		// Update original_filename to the new file's original name
		dbQueries.updateReceiptFileOriginalFilename.run(originalFilename, fileId)

		const updatedReceipt = getReceiptById(receiptId)
		res.json(updatedReceipt)
	} catch (error) {
		logger.error('Error replacing file:', error)
		res.status(500).json({ error: 'Failed to replace file' })
	}
})

// PUT /api/receipts/:id/flags - Update flags for receipt
router.put('/:id/flags', async (req, res) => {
	try {
		const id = parseInt(req.params.id, 10)
		if (isNaN(id)) {
			return res.status(400).json({ error: 'Invalid receipt ID: must be a number' })
		}
		const { flag_ids } = req.body

		if (!Array.isArray(flag_ids)) {
			return res.status(400).json({ error: 'flag_ids must be an array' })
		}

		const receipt = await updateReceipt(id, {}, flag_ids)
		if (!receipt) {
			return res.status(404).json({ error: 'Receipt not found' })
		}

		res.json(receipt)
	} catch (error) {
		logger.error('Error updating receipt flags:', error)
		res.status(500).json({ error: 'Failed to update receipt flags' })
	}
})

// POST /api/receipts/bulk-update - Bulk update multiple receipts
router.post('/bulk-update', async (req, res) => {
	try {
		const { receipt_ids, vendor, date, user_id, receipt_type_id, flag_ids, flag_operation } = req.body

		// Validate receipt_ids
		if (!Array.isArray(receipt_ids) || receipt_ids.length === 0) {
			return res.status(400).json({ error: 'receipt_ids must be a non-empty array' })
		}

		// Validate all receipt IDs are numbers
		const parsedReceiptIds = receipt_ids.map((id: any) => {
			const parsed = typeof id === 'string' ? parseInt(id, 10) : id
			if (isNaN(parsed)) {
				throw new Error(`Invalid receipt ID: ${id}`)
			}
			return parsed
		})

		// Validate that all receipts exist
		const dbQueries = (await import('../db')).dbQueries
		for (const id of parsedReceiptIds) {
			const receipt = dbQueries.getReceiptById.get(id)
			if (!receipt) {
				return res.status(400).json({ error: `Receipt with ID ${id} not found` })
			}
		}

		// Build update data
		const updateData: UpdateReceiptInput = {}

		if (vendor !== undefined && vendor !== null && vendor !== '') {
			const vendorValidation = validateVendor(vendor)
			if (!vendorValidation.valid) {
				return res.status(400).json({ error: vendorValidation.error })
			}
			updateData.vendor = sanitizeString(vendor)
		}

		if (date !== undefined && date !== null && date !== '') {
			const dateValidation = validateDate(date)
			if (!dateValidation.valid) {
				return res.status(400).json({ error: dateValidation.error })
			}
			updateData.date = date
		}

		if (user_id !== undefined && user_id !== null && user_id !== '') {
			const parsedUserId = parseInt(user_id as string, 10)
			if (isNaN(parsedUserId)) {
				return res.status(400).json({ error: 'Invalid user_id: must be a number' })
			}
			updateData.user_id = parsedUserId
		}

		if (receipt_type_id !== undefined && receipt_type_id !== null && receipt_type_id !== '') {
			const parsedReceiptTypeId = parseInt(receipt_type_id as string, 10)
			if (isNaN(parsedReceiptTypeId)) {
				return res.status(400).json({ error: 'Invalid receipt_type_id: must be a number' })
			}
			updateData.receipt_type_id = parsedReceiptTypeId
		}

		// Process flags - parse flag IDs if provided
		const parsedFlagIds = flag_ids !== undefined && flag_ids !== null && Array.isArray(flag_ids) && flag_ids.length > 0
			? flag_ids.filter((id: any) => typeof id === 'number' && !isNaN(id))
			: undefined

		// Update each receipt
		const errors: Array<{ id: number; error: string }> = []
		let updatedCount = 0

		for (const receiptId of parsedReceiptIds) {
			try {
				// Determine flag IDs for this receipt
				let receiptFlagIds: number[] | undefined = undefined
				
				if (parsedFlagIds && parsedFlagIds.length > 0) {
					if (flag_operation === 'append') {
						// For append: merge existing flags with new flags for this specific receipt
						const existingFlags = dbQueries.getFlagsByReceiptId.all(receiptId) as Array<{ id: number }>
						const existingFlagIds = existingFlags.map(f => f.id)
						// Merge and deduplicate
						const merged = new Set([...existingFlagIds, ...parsedFlagIds])
						receiptFlagIds = Array.from(merged)
					} else {
						// For replace (default): use only the new flags
						receiptFlagIds = parsedFlagIds
					}
				}

				const result = await updateReceipt(receiptId, updateData, receiptFlagIds)
				if (result) {
					updatedCount++
				} else {
					errors.push({ id: receiptId, error: 'Receipt not found' })
				}
			} catch (err: any) {
				errors.push({ id: receiptId, error: err.message || 'Failed to update receipt' })
			}
		}

		res.json({
			updated: updatedCount,
			errors: errors.length > 0 ? errors : undefined,
		})
	} catch (error: any) {
		logger.error('Error in bulk update:', error)
		res.status(500).json({ error: error.message || 'Failed to update receipts' })
	}
})

// POST /api/receipts/migrate-files - Migrate files from old structure to new user/date structure
router.post('/migrate-files', async (req, res) => {
	try {
		const results = await migrateFilesToDateStructure()
		res.json({
			message: 'File migration completed',
			...results,
		})
	} catch (error) {
		logger.error('Error migrating files:', error)
		res.status(500).json({ error: 'Failed to migrate files' })
	}
})

export default router
