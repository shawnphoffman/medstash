import express from 'express';
import { renameAllReceiptFiles, dryRunRenameAll, migrateFilesToDateStructure, dryRunMigrateFiles } from '../services/fileService';
import { logger } from '../utils/logger';

const router = express.Router();

// POST /api/filenames/rename-all - Rename all receipt files to match current pattern
router.post('/rename-all', async (req, res) => {
  try {
    const dryRun = req.query.dryRun === 'true';

    if (dryRun) {
      const preview = await dryRunRenameAll();
      return res.json({ dryRun: true, ...preview });
    }

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
      ...(isProduction ? {} : { details: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// POST /api/filenames/migrate-files - Migrate files to date-based structure
router.post('/migrate-files', async (req, res) => {
  try {
    const dryRun = req.query.dryRun === 'true';

    if (dryRun) {
      const preview = await dryRunMigrateFiles();
      return res.json({ dryRun: true, ...preview });
    }

    const results = await migrateFilesToDateStructure();
    res.json({
      success: true,
      ...results,
    });
  } catch (error) {
    logger.error('Error migrating files:', error);
    res.status(500).json({ error: 'Failed to migrate files' });
  }
});

export default router;
