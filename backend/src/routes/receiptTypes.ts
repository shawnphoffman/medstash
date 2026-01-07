import express from 'express';
import {
  getAllReceiptTypes,
  getReceiptTypeById,
  createReceiptType,
  updateReceiptType,
  deleteReceiptType,
} from '../services/dbService';
import { CreateReceiptTypeInput, UpdateReceiptTypeInput } from '../models/receipt';

const router = express.Router();

// GET /api/receipt-types - List all receipt types
router.get('/', (req, res) => {
  try {
    const types = getAllReceiptTypes();
    res.json(types);
  } catch (error) {
    console.error('Error fetching receipt types:', error);
    res.status(500).json({ error: 'Failed to fetch receipt types' });
  }
});

// GET /api/receipt-types/:id - Get receipt type by ID
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const type = getReceiptTypeById(id);
    if (!type) {
      return res.status(404).json({ error: 'Receipt type not found' });
    }
    res.json(type);
  } catch (error) {
    console.error('Error fetching receipt type:', error);
    res.status(500).json({ error: 'Failed to fetch receipt type' });
  }
});

// POST /api/receipt-types - Create receipt type
router.post('/', (req, res) => {
  try {
    const { name } = req.body as CreateReceiptTypeInput;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Receipt type name is required' });
    }

    const type = createReceiptType(name.trim());
    res.status(201).json(type);
  } catch (error) {
    console.error('Error creating receipt type:', error);
    res.status(500).json({ error: 'Failed to create receipt type' });
  }
});

// PUT /api/receipt-types/:id - Update receipt type
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name } = req.body as UpdateReceiptTypeInput;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ error: 'Receipt type name must be a non-empty string' });
    }

    const type = updateReceiptType(id, name?.trim());
    if (!type) {
      return res.status(404).json({ error: 'Receipt type not found' });
    }

    res.json(type);
  } catch (error) {
    console.error('Error updating receipt type:', error);
    res.status(500).json({ error: 'Failed to update receipt type' });
  }
});

// DELETE /api/receipt-types/:id - Delete receipt type
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = deleteReceiptType(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Receipt type not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting receipt type:', error);
    res.status(500).json({ error: 'Failed to delete receipt type' });
  }
});

export default router;

