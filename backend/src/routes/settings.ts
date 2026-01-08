import express from 'express';
import { getSetting, setSetting, getAllSettings } from '../services/dbService';
import { validatePattern } from '../utils/filename';

const router = express.Router();

// Whitelist of allowed setting keys for security
const ALLOWED_SETTING_KEYS = ['filenamePattern'] as const;
type AllowedSettingKey = typeof ALLOWED_SETTING_KEYS[number];

/**
 * Validate setting key is in the whitelist and doesn't contain dangerous characters
 */
function isValidSettingKey(key: string): key is AllowedSettingKey {
	// Reject empty keys, keys with path traversal, or keys with special characters
	if (!key || key.includes('..') || key.includes('/') || key.includes('\\') || key.includes('\0')) {
		return false;
	}
	// Only allow keys in the whitelist
	return ALLOWED_SETTING_KEYS.includes(key as AllowedSettingKey);
}

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
    
    // Validate setting key is in whitelist
    if (!isValidSettingKey(key)) {
      return res.status(400).json({ 
        error: `Invalid setting key: ${key}. Allowed keys: ${ALLOWED_SETTING_KEYS.join(', ')}` 
      });
    }
    
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

    // Validate setting key is in whitelist
    if (!isValidSettingKey(key)) {
      return res.status(400).json({ 
        error: `Invalid setting key: ${key}. Allowed keys: ${ALLOWED_SETTING_KEYS.join(', ')}` 
      });
    }

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    // Validate value based on key type
    if (key === 'filenamePattern') {
      if (typeof value !== 'string') {
        return res.status(400).json({ error: 'filenamePattern must be a string' });
      }
      const validation = validatePattern(value);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error || 'Invalid filename pattern' });
      }
    }

    setSetting(key, JSON.stringify(value));
    res.json({ key, value });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

export default router;

