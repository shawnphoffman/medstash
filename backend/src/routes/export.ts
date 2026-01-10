import express from 'express';
import archiver from 'archiver';
import { getAllReceipts } from '../services/dbService';
import { getReceiptFilePath } from '../services/fileService';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

const router = express.Router();

// GET /api/export - Generate zip archive of all receipts
router.get('/', async (req, res) => {
  try {
    const receipts = getAllReceipts();

    // Set headers for zip download
    res.attachment('medstash-export.zip');
    res.contentType('application/zip');

    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    archive.on('error', (err) => {
      logger.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create archive' });
      }
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add each receipt's files to the archive
    for (const receipt of receipts) {
      const receiptDir = `receipt-${receipt.id}`;

      // Add metadata file for each receipt
      const metadata = {
        id: receipt.id,
        user: receipt.user,
        type: receipt.type,
        amount: receipt.amount,
        vendor: receipt.vendor,
        provider_address: receipt.provider_address,
        description: receipt.description,
        date: receipt.date,
        notes: receipt.notes,
        flags: receipt.flags.map((f) => f.name),
        created_at: receipt.created_at,
        updated_at: receipt.updated_at,
      };

      archive.append(JSON.stringify(metadata, null, 2), {
        name: path.join(receiptDir, 'metadata.json'),
      });

      // Add all files for this receipt
      for (const file of receipt.files) {
        const filePath = getReceiptFilePath(receipt.id, file.filename);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, {
            name: path.join(receiptDir, file.original_filename),
          });
        }
      }
    }

    // Finalize the archive
    await archive.finalize();
  } catch (error) {
    logger.error('Error exporting receipts:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export receipts' });
    }
  }
});

export default router;

