import express from 'express'
import {
	getAllReceiptTypes,
	createReceiptType,
	updateReceiptType,
	deleteReceiptType,
	bulkUpdateReceiptTypes,
	resetReceiptTypesToDefaults,
} from '../services/dbService'
import { CreateReceiptTypeInput, UpdateReceiptTypeInput } from '../models/receipt'
import { sanitizeString } from '../utils/sanitization'
import { logger } from '../utils/logger'

const router = express.Router()

// GET /api/receipt-types - List all receipt types
router.get('/', (req, res) => {
	try {
		const types = getAllReceiptTypes()
		res.json(types)
	} catch (error) {
		logger.error('Error fetching receipt types:', error)
		res.status(500).json({ error: 'Failed to fetch receipt types' })
	}
})

// POST /api/receipt-types - Create receipt type
router.post('/', (req, res) => {
	try {
		const { name, group_id, display_order } = req.body as CreateReceiptTypeInput & { display_order?: number }

		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return res.status(400).json({ error: 'Receipt type name is required' })
		}

		const sanitizedName = sanitizeString(name)
		if (sanitizedName.length === 0) {
			return res.status(400).json({ error: 'Receipt type name cannot be empty after sanitization' })
		}

		if (group_id !== undefined && group_id !== null && (typeof group_id !== 'number' || isNaN(group_id))) {
			return res.status(400).json({ error: 'Group ID must be a number or null' })
		}

		if (display_order !== undefined && (typeof display_order !== 'number' || isNaN(display_order))) {
			return res.status(400).json({ error: 'Display order must be a number' })
		}

		const type = createReceiptType(sanitizedName, group_id, display_order)
		res.status(201).json(type)
	} catch (error) {
		logger.error('Error creating receipt type:', error)
		res.status(500).json({ error: 'Failed to create receipt type' })
	}
})

// PUT /api/receipt-types/:id - Update receipt type
router.put('/:id', (req, res) => {
	try {
		const id = parseInt(req.params.id, 10)
		if (isNaN(id)) {
			return res.status(400).json({ error: 'Invalid receipt type ID: must be a number' })
		}
		const { name, group_id, display_order } = req.body as UpdateReceiptTypeInput & { display_order?: number }

		if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
			return res.status(400).json({ error: 'Receipt type name must be a non-empty string' })
		}

		if (group_id !== undefined && group_id !== null && (typeof group_id !== 'number' || isNaN(group_id))) {
			return res.status(400).json({ error: 'Group ID must be a number or null' })
		}

		if (display_order !== undefined && (typeof display_order !== 'number' || isNaN(display_order))) {
			return res.status(400).json({ error: 'Display order must be a number' })
		}

		const sanitizedName = name ? sanitizeString(name) : undefined
		if (sanitizedName !== undefined && sanitizedName.length === 0) {
			return res.status(400).json({ error: 'Receipt type name cannot be empty after sanitization' })
		}

		const type = updateReceiptType(id, sanitizedName, group_id, display_order)
		if (!type) {
			return res.status(404).json({ error: 'Receipt type not found' })
		}

		res.json(type)
	} catch (error) {
		logger.error('Error updating receipt type:', error)
		res.status(500).json({ error: 'Failed to update receipt type' })
	}
})

// DELETE /api/receipt-types/:id - Delete receipt type
router.delete('/:id', (req, res) => {
	try {
		const id = parseInt(req.params.id, 10)
		if (isNaN(id)) {
			return res.status(400).json({ error: 'Invalid receipt type ID: must be a number' })
		}
		const deleted = deleteReceiptType(id)
		if (!deleted) {
			return res.status(404).json({ error: 'Receipt type not found' })
		}

		res.status(204).send()
	} catch (error: any) {
		logger.error('Error deleting receipt type:', error)
		// Check if it's the only type remaining
		if (error.message && error.message.includes('only type remaining')) {
			return res.status(400).json({ error: error.message })
		}
		res.status(500).json({ error: 'Failed to delete receipt type' })
	}
})

// POST /api/receipt-types/bulk-update - Bulk update receipt types
router.post('/bulk-update', (req, res) => {
	try {
		const { updates } = req.body as { updates: Array<{ id: number; group_id: number | null; display_order: number }> }

		if (!Array.isArray(updates)) {
			return res.status(400).json({ error: 'updates must be an array' })
		}

		if (updates.length === 0) {
			return res.status(400).json({ error: 'updates array cannot be empty' })
		}

		// Validate each update
		for (const update of updates) {
			if (typeof update.id !== 'number' || isNaN(update.id)) {
				return res.status(400).json({ error: 'Each update must have a valid id (number)' })
			}
			if (update.group_id !== null && (typeof update.group_id !== 'number' || isNaN(update.group_id))) {
				return res.status(400).json({ error: 'group_id must be a number or null' })
			}
			if (typeof update.display_order !== 'number' || isNaN(update.display_order)) {
				return res.status(400).json({ error: 'Each update must have a valid display_order (number)' })
			}
		}

		const updatedTypes = bulkUpdateReceiptTypes(updates)
		res.json(updatedTypes)
	} catch (error) {
		logger.error('Error bulk updating receipt types:', error)
		res.status(500).json({ error: 'Failed to bulk update receipt types' })
	}
})

// POST /api/receipt-types/reset-to-defaults - Reset all receipt types and groups to defaults
router.post('/reset-to-defaults', (req, res) => {
	try {
		const { defaultGroups, ungroupedTypes } = req.body as {
			defaultGroups: Array<{ name: string; display_order: number; types: string[] }>
			ungroupedTypes?: string[]
		}

		if (!Array.isArray(defaultGroups)) {
			return res.status(400).json({ error: 'defaultGroups must be an array' })
		}

		// Validate defaultGroups structure
		for (const group of defaultGroups) {
			if (!group.name || typeof group.name !== 'string') {
				return res.status(400).json({ error: 'Each group must have a valid name (string)' })
			}
			if (typeof group.display_order !== 'number' || isNaN(group.display_order)) {
				return res.status(400).json({ error: 'Each group must have a valid display_order (number)' })
			}
			if (!Array.isArray(group.types)) {
				return res.status(400).json({ error: 'Each group must have a types array' })
			}
			for (const typeName of group.types) {
				if (typeof typeName !== 'string' || typeName.trim().length === 0) {
					return res.status(400).json({ error: 'Each type name must be a non-empty string' })
				}
			}
		}

		// Validate ungroupedTypes if provided
		if (ungroupedTypes !== undefined) {
			if (!Array.isArray(ungroupedTypes)) {
				return res.status(400).json({ error: 'ungroupedTypes must be an array' })
			}
			for (const typeName of ungroupedTypes) {
				if (typeof typeName !== 'string' || typeName.trim().length === 0) {
					return res.status(400).json({ error: 'Each ungrouped type name must be a non-empty string' })
				}
			}
		}

		const result = resetReceiptTypesToDefaults(defaultGroups, ungroupedTypes)
		res.json(result)
	} catch (error: any) {
		logger.error('Error resetting receipt types to defaults:', error)
		const errorMessage = error?.message || 'Unknown error'
		logger.error('Error details:', { message: errorMessage, stack: error?.stack })
		res.status(500).json({ error: 'Failed to reset receipt types to defaults', details: errorMessage })
	}
})

export default router
