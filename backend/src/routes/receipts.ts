import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  getAllReceipts,
  getReceiptById,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  addReceiptFile,
} from '../services/dbService';
import {
  saveReceiptFile,
  deleteReceiptFiles,
  getReceiptFilePath,
  fileExists,
  deleteReceiptFile as deleteFile,
  restoreFileAssociations,
  replaceReceiptFile,
} from '../services/fileService';
import { CreateReceiptInput, UpdateReceiptInput } from '../models/receipt';
import { dbQueries } from '../db';
import fs from 'fs/promises';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/medstash-uploads',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// Ensure upload directory exists
(async () => {
  try {
    await fs.mkdir('/tmp/medstash-uploads', { recursive: true });
  } catch (error) {
    console.error('Failed to create upload directory:', error);
  }
})();

// GET /api/receipts - List all receipts
router.get('/', (req, res) => {
  try {
    const flagId = req.query.flag_id ? parseInt(req.query.flag_id as string) : undefined;
    const receipts = getAllReceipts(flagId);
    res.json(receipts);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

// GET /api/receipts/:id - Get receipt by ID
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const receipt = getReceiptById(id);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    res.json(receipt);
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
});

// POST /api/receipts - Create receipt with files
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const {
      user_id,
      receipt_type_id,
      user, // Legacy support
      type, // Legacy support
      amount,
      vendor,
      provider_address,
      description,
      date,
      notes,
      flag_ids,
    } = req.body;

    // Validate that at least one file is provided
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: 'At least one file is required',
      });
    }

    // All fields are optional except files - provide defaults
    const receiptData: CreateReceiptInput = {
      user_id: user_id ? parseInt(user_id) : undefined,
      receipt_type_id: receipt_type_id ? parseInt(receipt_type_id) : undefined,
      user: user || undefined, // Legacy support
      type: type || undefined, // Legacy support
      amount: amount ? parseFloat(amount) : 0,
      vendor: vendor || '',
      provider_address: provider_address || '',
      description: description || '',
      date: date || new Date().toISOString().split('T')[0],
      notes: notes || undefined,
      flag_ids: flag_ids ? JSON.parse(flag_ids) : [],
    };

    // Create receipt
    const receipt = createReceipt(receiptData, receiptData.flag_ids);

    // Process files
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { filename, originalFilename } = await saveReceiptFile(
          file,
          receipt.id,
          receipt.date,
          receipt.user,
          receipt.vendor,
          receipt.amount,
          receipt.type,
          i,
          receipt.flags
        );

        addReceiptFile(receipt.id, filename, originalFilename, i);
      }
    }

    // Return updated receipt with files
    const updatedReceipt = getReceiptById(receipt.id);
    res.status(201).json(updatedReceipt);
  } catch (error) {
    console.error('Error creating receipt:', error);
    res.status(500).json({ error: 'Failed to create receipt' });
  }
});

// PUT /api/receipts/:id - Update receipt
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      user_id,
      receipt_type_id,
      user, // Legacy support
      type, // Legacy support
      amount,
      vendor,
      provider_address,
      description,
      date,
      notes,
      flag_ids,
    } = req.body;

    const updateData: UpdateReceiptInput = {};
    if (user_id !== undefined) updateData.user_id = parseInt(user_id);
    if (receipt_type_id !== undefined) updateData.receipt_type_id = parseInt(receipt_type_id);
    if (user !== undefined) updateData.user = user; // Legacy support
    if (type !== undefined) updateData.type = type; // Legacy support
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (vendor !== undefined) updateData.vendor = vendor;
    if (provider_address !== undefined) updateData.provider_address = provider_address;
    if (description !== undefined) updateData.description = description;
    if (date !== undefined) updateData.date = date;
    if (notes !== undefined) updateData.notes = notes;

    let flagIds: number[] | undefined;
    if (flag_ids !== undefined) {
      if (Array.isArray(flag_ids)) {
        flagIds = flag_ids;
      } else if (typeof flag_ids === 'string') {
        try {
          flagIds = JSON.parse(flag_ids);
        } catch (e) {
          flagIds = undefined;
        }
      }
    }

    const receipt = await updateReceipt(id, updateData, flagIds);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json(receipt);
  } catch (error) {
    console.error('Error updating receipt:', error);
    res.status(500).json({ error: 'Failed to update receipt' });
  }
});

// DELETE /api/receipts/:id - Delete receipt
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = deleteReceipt(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Delete files from filesystem
    await deleteReceiptFiles(id);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({ error: 'Failed to delete receipt' });
  }
});

// POST /api/receipts/:id/files - Add files to existing receipt
router.post('/:id/files', upload.array('files', 10), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const receipt = getReceiptById(id);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    // Allow receipt data to be overridden from request body (for updated values)
    // This ensures files are named with the latest receipt data
    const date = req.body.date || receipt.date;
    const user = req.body.user || receipt.user; // Already resolved to name in getReceiptById
    const vendor = req.body.vendor || receipt.vendor;
    const amount = req.body.amount ? parseFloat(req.body.amount) : receipt.amount;
    const type = req.body.type || receipt.type; // Already resolved to name in getReceiptById

    const existingFiles = receipt.files;
    let fileOrder = existingFiles.length;

    for (const file of files) {
      const { filename, originalFilename } = await saveReceiptFile(
        file,
        receipt.id,
        date,
        user,
        vendor,
        amount,
        type,
        fileOrder,
        receipt.flags
      );

      addReceiptFile(receipt.id, filename, originalFilename, fileOrder);
      fileOrder++;
    }

    const updatedReceipt = getReceiptById(id);
    res.json(updatedReceipt);
  } catch (error) {
    console.error('Error adding files to receipt:', error);
    res.status(500).json({ error: 'Failed to add files to receipt' });
  }
});

// GET /api/receipts/:id/files/:fileId - Download file
router.get('/:id/files/:fileId', async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const fileId = parseInt(req.params.fileId);

    const receipt = getReceiptById(receiptId);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const file = receipt.files.find((f) => f.id === fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = getReceiptFilePath(receiptId, file.filename);
    const exists = await fileExists(receiptId, file.filename);

    if (!exists) {
      return res.status(404).json({
        error: 'File not found on disk. The file may have been deleted or moved.'
      });
    }

    // Check if this is a preview request (for inline display) or download
    const isPreview = req.query.preview === 'true';
    const isPdf = file.original_filename.toLowerCase().endsWith('.pdf');
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.original_filename);

    // For previews (PDFs and images), serve inline; otherwise download
    try {
      if (isPreview || (isPdf || isImage)) {
        res.setHeader('Content-Disposition', `inline; filename="${file.original_filename}"`);
        res.sendFile(path.resolve(filePath), (err) => {
          if (err) {
            if (!res.headersSent) {
              console.error('Error sending file:', err);
              res.status(500).json({
                error: 'Failed to retrieve file. The file may be corrupted or inaccessible.'
              });
            }
          }
        });
      } else {
        res.download(filePath, file.original_filename, (err) => {
          if (err) {
            if (!res.headersSent) {
              console.error('Error downloading file:', err);
              res.status(500).json({
                error: 'Failed to download file. The file may be corrupted or inaccessible.'
              });
            }
          }
        });
      }
    } catch (sendError: any) {
      // Handle errors from sendFile/download that occur synchronously
      if (!res.headersSent) {
        console.error('Error sending file:', sendError);
        res.status(500).json({
          error: 'Failed to retrieve file. The file may be corrupted or inaccessible.'
        });
      }
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download file' });
    }
  }
});

// DELETE /api/receipts/:id/files/:fileId - Delete a file from receipt
router.delete('/:id/files/:fileId', async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const fileId = parseInt(req.params.fileId);

    const receipt = getReceiptById(receiptId);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const file = receipt.files.find((f) => f.id === fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from database
    dbQueries.deleteReceiptFile.run(fileId);

    // Delete from filesystem
    await deleteFile(receiptId, file.filename);

    const updatedReceipt = getReceiptById(receiptId);
    res.json(updatedReceipt);
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// PUT /api/receipts/:id/files/:fileId - Replace a file
router.put('/:id/files/:fileId', upload.single('file'), async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const fileId = parseInt(req.params.fileId);

    const receipt = getReceiptById(receiptId);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const file = receipt.files.find((f) => f.id === fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Delete old file from disk (if it exists)
    await deleteFile(receiptId, file.filename);

    // Replace with new file, keeping the same filename
    const { originalFilename } = await replaceReceiptFile(
      req.file,
      receiptId,
      file.filename
    );

    // Update original_filename to the new file's original name
    dbQueries.updateReceiptFileOriginalFilename.run(originalFilename, fileId);

    const updatedReceipt = getReceiptById(receiptId);
    res.json(updatedReceipt);
  } catch (error) {
    console.error('Error replacing file:', error);
    res.status(500).json({ error: 'Failed to replace file' });
  }
});

// PUT /api/receipts/:id/flags - Update flags for receipt
router.put('/:id/flags', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { flag_ids } = req.body;

    if (!Array.isArray(flag_ids)) {
      return res.status(400).json({ error: 'flag_ids must be an array' });
    }

    const receipt = await updateReceipt(id, {}, flag_ids);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json(receipt);
  } catch (error) {
    console.error('Error updating receipt flags:', error);
    res.status(500).json({ error: 'Failed to update receipt flags' });
  }
});

// POST /api/receipts/restore-files - Restore file associations from filesystem
router.post('/restore-files', async (req, res) => {
  try {
    const results = await restoreFileAssociations();
    res.json({
      message: 'File associations restored',
      ...results,
    });
  } catch (error) {
    console.error('Error restoring file associations:', error);
    res.status(500).json({ error: 'Failed to restore file associations' });
  }
});

export default router;

