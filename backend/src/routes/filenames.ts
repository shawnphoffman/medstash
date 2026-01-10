import express from 'express';
import { renameAllReceiptFiles } from '../services/fileService';
import { logger } from '../utils/logger';

const router = express.Router();

// POST /api/filenames/rename-all - Rename all receipt files to match current pattern
router.post('/rename-all', async (req, res) => {
  try {
    const results = await renameAllReceiptFiles();
    res.json({
      success: true,
      ...results,
    });
  } catch (error) {
    logger.error('Error renaming all files:', error);
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({
      error: 'Failed to rename all files',
      // Only expose error details in development for debugging
      ...(isProduction ? {} : { details: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

export default router;


