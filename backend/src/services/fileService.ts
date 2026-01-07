import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { generateReceiptFilename } from '../utils/filename';
import { ReceiptFile } from '../models/receipt';

const RECEIPTS_DIR = process.env.RECEIPTS_DIR || '/data/receipts';

/**
 * Ensure receipts directory exists
 */
export async function ensureReceiptsDir(): Promise<void> {
  try {
    await fs.access(RECEIPTS_DIR);
  } catch {
    await fs.mkdir(RECEIPTS_DIR, { recursive: true });
  }
}

/**
 * Get the directory path for a specific receipt
 */
export function getReceiptDir(receiptId: number): string {
  return path.join(RECEIPTS_DIR, receiptId.toString());
}

/**
 * Ensure receipt-specific directory exists
 */
export async function ensureReceiptDir(receiptId: number): Promise<string> {
  const receiptDir = getReceiptDir(receiptId);
  try {
    await fs.access(receiptDir);
  } catch {
    await fs.mkdir(receiptDir, { recursive: true });
  }
  return receiptDir;
}

/**
 * Optimize image file if it's an image, otherwise return original
 * Converts JPEG/PNG to WebP at 85% quality
 */
export async function optimizeImage(
  inputPath: string,
  outputPath: string
): Promise<void> {
  try {
    await sharp(inputPath)
      .webp({ quality: 85 })
      .toFile(outputPath);
  } catch (error) {
    // If optimization fails, copy original
    await fs.copyFile(inputPath, outputPath);
    throw error;
  }
}

/**
 * Check if file is an image that can be optimized
 */
export function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
}

/**
 * Check if file is a PDF
 */
export function isPdfFile(filename: string): boolean {
  return path.extname(filename).toLowerCase() === '.pdf';
}

/**
 * Process and save uploaded file
 * Returns the final filename and whether it was optimized
 */
export async function saveReceiptFile(
  file: Express.Multer.File,
  receiptId: number,
  date: string,
  user: string,
  vendor: string,
  amount: number,
  type: string,
  fileOrder: number
): Promise<{ filename: string; originalFilename: string; optimized: boolean }> {
  await ensureReceiptDir(receiptId);
  const receiptDir = getReceiptDir(receiptId);

  const originalExt = path.extname(file.originalname);
  const originalFilename = file.originalname;

  // Generate filename
  const filename = generateReceiptFilename(
    date,
    user,
    vendor,
    amount,
    type,
    fileOrder,
    originalExt
  );

  const filePath = path.join(receiptDir, filename);

  let optimized = false;

  // Optimize if it's an image
  if (isImageFile(originalFilename)) {
    try {
      await optimizeImage(file.path, filePath);
      optimized = true;
      // Delete temporary file
      await fs.unlink(file.path);
    } catch (error) {
      // If optimization fails, just copy the original
      await fs.copyFile(file.path, filePath);
      await fs.unlink(file.path);
    }
  } else {
    // For PDFs and other files, copy then delete (can't use rename across volumes in Docker)
    await fs.copyFile(file.path, filePath);
    await fs.unlink(file.path);
  }

  return { filename, originalFilename, optimized };
}

/**
 * Delete a receipt file from disk
 */
export async function deleteReceiptFile(
  receiptId: number,
  filename: string
): Promise<void> {
  const filePath = path.join(getReceiptDir(receiptId), filename);
  try {
    await fs.unlink(filePath);
  } catch (error: any) {
    // File might not exist, that's okay - only log unexpected errors
    if (error?.code !== 'ENOENT') {
      console.warn(`Failed to delete file ${filePath}:`, error);
    }
  }
}

/**
 * Delete all files for a receipt
 */
export async function deleteReceiptFiles(receiptId: number): Promise<void> {
  const receiptDir = getReceiptDir(receiptId);
  try {
    await fs.rm(receiptDir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to delete receipt directory ${receiptDir}:`, error);
  }
}

/**
 * Get file path for a receipt file
 */
export function getReceiptFilePath(receiptId: number, filename: string): string {
  return path.join(getReceiptDir(receiptId), filename);
}

/**
 * Check if file exists
 */
export async function fileExists(
  receiptId: number,
  filename: string
): Promise<boolean> {
  const filePath = getReceiptFilePath(receiptId, filename);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

