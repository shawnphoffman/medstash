import express from 'express';
import {
  getAllReceiptTypes,
  getReceiptTypeById,
  createReceiptType,
  updateReceiptType,
  deleteReceiptType,
  moveReceiptTypeToGroup,
} from '../services/dbService';
import { CreateReceiptTypeInput, UpdateReceiptTypeInput } from '../models/receipt';
import { sanitizeString } from '../utils/sanitization';
import { logger } from '../utils/logger';

const router = express.Router();

// GET /api/receipt-types - List all receipt types
router.get('/', (req, res) => {
  try {
    const types = getAllReceiptTypes();
    res.json(types);
  } catch (error) {
    logger.error('Error fetching receipt types:', error);
    res.status(500).json({ error: 'Failed to fetch receipt types' });
  }
});

// GET /api/receipt-types/:id - Get receipt type by ID
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid receipt type ID: must be a number' });
    }
    const type = getReceiptTypeById(id);
    if (!type) {
      return res.status(404).json({ error: 'Receipt type not found' });
    }
    res.json(type);
  } catch (error) {
    logger.error('Error fetching receipt type:', error);
    res.status(500).json({ error: 'Failed to fetch receipt type' });
  }
});

// POST /api/receipt-types - Create receipt type
router.post('/', (req, res) => {
  try {
    const { name, group_id, display_order } = req.body as CreateReceiptTypeInput & { display_order?: number };

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Receipt type name is required' });
    }

    const sanitizedName = sanitizeString(name);
    if (sanitizedName.length === 0) {
      return res.status(400).json({ error: 'Receipt type name cannot be empty after sanitization' });
    }

    if (group_id !== undefined && group_id !== null && (typeof group_id !== 'number' || isNaN(group_id))) {
      return res.status(400).json({ error: 'Group ID must be a number or null' });
    }

    if (display_order !== undefined && (typeof display_order !== 'number' || isNaN(display_order))) {
      return res.status(400).json({ error: 'Display order must be a number' });
    }

    const type = createReceiptType(sanitizedName, group_id, display_order);
    res.status(201).json(type);
  } catch (error) {
    logger.error('Error creating receipt type:', error);
    res.status(500).json({ error: 'Failed to create receipt type' });
  }
});

// PUT /api/receipt-types/:id - Update receipt type
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid receipt type ID: must be a number' });
    }
    const { name, group_id, display_order } = req.body as UpdateReceiptTypeInput & { display_order?: number };

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ error: 'Receipt type name must be a non-empty string' });
    }

    if (group_id !== undefined && group_id !== null && (typeof group_id !== 'number' || isNaN(group_id))) {
      return res.status(400).json({ error: 'Group ID must be a number or null' });
    }

    if (display_order !== undefined && (typeof display_order !== 'number' || isNaN(display_order))) {
      return res.status(400).json({ error: 'Display order must be a number' });
    }

    const sanitizedName = name ? sanitizeString(name) : undefined;
    if (sanitizedName !== undefined && sanitizedName.length === 0) {
      return res.status(400).json({ error: 'Receipt type name cannot be empty after sanitization' });
    }

    const type = updateReceiptType(id, sanitizedName, group_id, display_order);
    if (!type) {
      return res.status(404).json({ error: 'Receipt type not found' });
    }

    res.json(type);
  } catch (error) {
    logger.error('Error updating receipt type:', error);
    res.status(500).json({ error: 'Failed to update receipt type' });
  }
});

// PUT /api/receipt-types/:id/move - Move receipt type to different group
router.put('/:id/move', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid receipt type ID: must be a number' });
    }
    const { group_id, display_order } = req.body as { group_id?: number | null; display_order?: number };

    if (group_id !== undefined && group_id !== null && (typeof group_id !== 'number' || isNaN(group_id))) {
      return res.status(400).json({ error: 'Group ID must be a number or null' });
    }

    if (display_order !== undefined && (typeof display_order !== 'number' || isNaN(display_order))) {
      return res.status(400).json({ error: 'Display order must be a number' });
    }

    const type = moveReceiptTypeToGroup(id, group_id ?? null, display_order);
    if (!type) {
      return res.status(404).json({ error: 'Receipt type not found' });
    }

    res.json(type);
  } catch (error) {
    logger.error('Error moving receipt type:', error);
    res.status(500).json({ error: 'Failed to move receipt type' });
  }
});

// DELETE /api/receipt-types/:id - Delete receipt type
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid receipt type ID: must be a number' });
    }
    const deleted = deleteReceiptType(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Receipt type not found' });
    }

    res.status(204).send();
  } catch (error: any) {
    logger.error('Error deleting receipt type:', error);
    // Check if it's the only type remaining
    if (error.message && error.message.includes('only type remaining')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete receipt type' });
  }
});

export default router;

