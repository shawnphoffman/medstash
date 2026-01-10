import express from 'express';
import {
  getAllReceiptTypeGroups,
  getReceiptTypeGroupById,
  createReceiptTypeGroup,
  updateReceiptTypeGroup,
  deleteReceiptTypeGroup,
} from '../services/dbService';
import { CreateReceiptTypeGroupInput, UpdateReceiptTypeGroupInput } from '../models/receipt';
import { sanitizeString } from '../utils/sanitization';
import { logger } from '../utils/logger';

const router = express.Router();

// GET /api/receipt-type-groups - List all groups
router.get('/', (req, res) => {
  try {
    const groups = getAllReceiptTypeGroups();
    res.json(groups);
  } catch (error) {
    logger.error('Error fetching receipt type groups:', error);
    res.status(500).json({ error: 'Failed to fetch receipt type groups' });
  }
});

// GET /api/receipt-type-groups/:id - Get group by ID
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid receipt type group ID: must be a number' });
    }
    const group = getReceiptTypeGroupById(id);
    if (!group) {
      return res.status(404).json({ error: 'Receipt type group not found' });
    }
    res.json(group);
  } catch (error) {
    logger.error('Error fetching receipt type group:', error);
    res.status(500).json({ error: 'Failed to fetch receipt type group' });
  }
});

// POST /api/receipt-type-groups - Create group
router.post('/', (req, res) => {
  try {
    const { name, display_order } = req.body as CreateReceiptTypeGroupInput & { display_order?: number };

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Receipt type group name is required' });
    }

    const sanitizedName = sanitizeString(name);
    if (sanitizedName.length === 0) {
      return res.status(400).json({ error: 'Receipt type group name cannot be empty after sanitization' });
    }

    if (display_order !== undefined && (typeof display_order !== 'number' || isNaN(display_order))) {
      return res.status(400).json({ error: 'Display order must be a number' });
    }

    const group = createReceiptTypeGroup(sanitizedName, display_order);
    res.status(201).json(group);
  } catch (error) {
    logger.error('Error creating receipt type group:', error);
    res.status(500).json({ error: 'Failed to create receipt type group' });
  }
});

// PUT /api/receipt-type-groups/:id - Update group
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid receipt type group ID: must be a number' });
    }
    const { name, display_order } = req.body as UpdateReceiptTypeGroupInput & { display_order?: number };

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ error: 'Receipt type group name must be a non-empty string' });
    }

    if (display_order !== undefined && (typeof display_order !== 'number' || isNaN(display_order))) {
      return res.status(400).json({ error: 'Display order must be a number' });
    }

    const sanitizedName = name ? sanitizeString(name) : undefined;
    if (sanitizedName !== undefined && sanitizedName.length === 0) {
      return res.status(400).json({ error: 'Receipt type group name cannot be empty after sanitization' });
    }

    const group = updateReceiptTypeGroup(id, sanitizedName, display_order);
    if (!group) {
      return res.status(404).json({ error: 'Receipt type group not found' });
    }

    res.json(group);
  } catch (error) {
    logger.error('Error updating receipt type group:', error);
    res.status(500).json({ error: 'Failed to update receipt type group' });
  }
});

// DELETE /api/receipt-type-groups/:id - Delete group (ungroups types)
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid receipt type group ID: must be a number' });
    }
    const deleted = deleteReceiptTypeGroup(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Receipt type group not found' });
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting receipt type group:', error);
    res.status(500).json({ error: 'Failed to delete receipt type group' });
  }
});

export default router;
