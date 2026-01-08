import express from 'express';
import {
  getAllFlags,
  getFlagById,
  createFlag,
  updateFlag,
  deleteFlag,
} from '../services/dbService';
import { CreateFlagInput, UpdateFlagInput } from '../models/receipt';
import { sanitizeString } from '../utils/sanitization';

const router = express.Router();

// GET /api/flags - List all flags
router.get('/', (req, res) => {
  try {
    const flags = getAllFlags();
    res.json(flags);
  } catch (error) {
    console.error('Error fetching flags:', error);
    res.status(500).json({ error: 'Failed to fetch flags' });
  }
});

// GET /api/flags/:id - Get flag by ID
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid flag ID: must be a number' });
    }
    const flag = getFlagById(id);
    if (!flag) {
      return res.status(404).json({ error: 'Flag not found' });
    }
    res.json(flag);
  } catch (error) {
    console.error('Error fetching flag:', error);
    res.status(500).json({ error: 'Failed to fetch flag' });
  }
});

// POST /api/flags - Create flag
router.post('/', (req, res) => {
  try {
    const { name, color } = req.body as CreateFlagInput;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Flag name is required' });
    }

    const sanitizedName = sanitizeString(name);
    if (sanitizedName.length === 0) {
      return res.status(400).json({ error: 'Flag name cannot be empty after sanitization' });
    }

    const flag = createFlag(sanitizedName, color);
    res.status(201).json(flag);
  } catch (error) {
    console.error('Error creating flag:', error);
    res.status(500).json({ error: 'Failed to create flag' });
  }
});

// PUT /api/flags/:id - Update flag
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid flag ID: must be a number' });
    }
    const { name, color } = req.body as UpdateFlagInput;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ error: 'Flag name must be a non-empty string' });
    }

    const sanitizedName = name ? sanitizeString(name) : undefined;
    if (sanitizedName !== undefined && sanitizedName.length === 0) {
      return res.status(400).json({ error: 'Flag name cannot be empty after sanitization' });
    }

    const flag = updateFlag(id, sanitizedName, color);
    if (!flag) {
      return res.status(404).json({ error: 'Flag not found' });
    }

    res.json(flag);
  } catch (error) {
    console.error('Error updating flag:', error);
    res.status(500).json({ error: 'Failed to update flag' });
  }
});

// DELETE /api/flags/:id - Delete flag
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid flag ID: must be a number' });
    }
    const deleted = deleteFlag(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Flag not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting flag:', error);
    res.status(500).json({ error: 'Failed to delete flag' });
  }
});

export default router;

