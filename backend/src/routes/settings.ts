import express from 'express';
import { getSetting, setSetting, getAllSettings } from '../services/dbService';

const router = express.Router();

// GET /api/settings - Get all settings
router.get('/', (req, res) => {
  try {
    const settings = getAllSettings();
    // Parse JSON values
    const parsedSettings: Record<string, any> = {};
    for (const [key, value] of Object.entries(settings)) {
      try {
        parsedSettings[key] = JSON.parse(value);
      } catch {
        parsedSettings[key] = value;
      }
    }
    res.json(parsedSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// GET /api/settings/:key - Get specific setting
router.get('/:key', (req, res) => {
  try {
    const { key } = req.params;
    const value = getSetting(key);
    if (value === null) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    try {
      const parsedValue = JSON.parse(value);
      res.json({ key, value: parsedValue });
    } catch (parseError) {
      // If JSON parsing fails, return as string
      res.json({ key, value });
    }
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// PUT /api/settings/:key - Update setting
router.put('/:key', (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    setSetting(key, JSON.stringify(value));
    res.json({ key, value });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

export default router;

