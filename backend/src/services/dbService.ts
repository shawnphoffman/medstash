import { dbQueries } from '../db';
import { Receipt, ReceiptFile, Flag, ReceiptWithFiles, CreateReceiptInput } from '../models/receipt';

/**
 * Get receipt by ID with files and flags
 */
export function getReceiptById(id: number): ReceiptWithFiles | null {
  const receipt = dbQueries.getReceiptById.get(id) as Receipt | null;
  if (!receipt) return null;

  const files = dbQueries.getFilesByReceiptId.all(id) as ReceiptFile[];
  const flags = dbQueries.getFlagsByReceiptId.all(id) as Flag[];

  return {
    ...receipt,
    files,
    flags,
  };
}

/**
 * Get all receipts with files and flags
 */
export function getAllReceipts(flagId?: number): ReceiptWithFiles[] {
  const receipts = (flagId
    ? dbQueries.getReceiptsByFlag.all(flagId)
    : dbQueries.getAllReceipts.all()) as Receipt[];

  return receipts.map((receipt) => {
    const files = dbQueries.getFilesByReceiptId.all(receipt.id) as ReceiptFile[];
    const flags = dbQueries.getFlagsByReceiptId.all(receipt.id) as Flag[];
    return {
      ...receipt,
      files,
      flags,
    };
  });
}

/**
 * Create a new receipt
 */
export function createReceipt(
  receiptData: CreateReceiptInput,
  flagIds: number[] = []
): ReceiptWithFiles {
  // Provide defaults for optional fields
  const user = receiptData.user || 'Unknown';
  const type = receiptData.type || 'Other';
  const amount = receiptData.amount ?? 0;
  const vendor = receiptData.vendor || '';
  const provider_address = receiptData.provider_address || '';
  const description = receiptData.description || '';
  const date = receiptData.date || new Date().toISOString().split('T')[0];
  const notes = receiptData.notes || null;

  const result = dbQueries.insertReceipt.run(
    user,
    type,
    amount,
    vendor,
    provider_address,
    description,
    date,
    notes
  );

  const receiptId = result.lastInsertRowid as number;

  // Add flags
  if (flagIds.length > 0) {
    for (const flagId of flagIds) {
      dbQueries.insertReceiptFlag.run(receiptId, flagId);
    }
  }

  return getReceiptById(receiptId)!;
}

/**
 * Update a receipt
 */
export function updateReceipt(
  id: number,
  receiptData: Partial<Omit<Receipt, 'id' | 'created_at' | 'updated_at'>>,
  flagIds?: number[]
): ReceiptWithFiles | null {
  const existing = dbQueries.getReceiptById.get(id) as Receipt | null;
  if (!existing) return null;

  const updated: Receipt = {
    ...existing,
    ...receiptData,
  };

  dbQueries.updateReceipt.run(
    updated.user,
    updated.type,
    updated.amount,
    updated.vendor,
    updated.provider_address,
    updated.description,
    updated.date,
    updated.notes || null,
    id
  );

  // Update flags if provided
  if (flagIds !== undefined) {
    dbQueries.deleteReceiptFlags.run(id);
    for (const flagId of flagIds) {
      dbQueries.insertReceiptFlag.run(id, flagId);
    }
  }

  return getReceiptById(id);
}

/**
 * Delete a receipt
 */
export function deleteReceipt(id: number): boolean {
  const receipt = dbQueries.getReceiptById.get(id) as Receipt | null;
  if (!receipt) return false;

  dbQueries.deleteReceipt.run(id);
  return true;
}

/**
 * Add a file to a receipt
 */
export function addReceiptFile(
  receiptId: number,
  filename: string,
  originalFilename: string,
  fileOrder: number
): ReceiptFile {
  const result = dbQueries.insertReceiptFile.run(
    receiptId,
    filename,
    originalFilename,
    fileOrder
  );

  const files = dbQueries.getFilesByReceiptId.all(receiptId) as ReceiptFile[];
  return files.find(
    (f) => f.id === (result.lastInsertRowid as number)
  ) as ReceiptFile;
}

/**
 * Get all flags
 */
export function getAllFlags(): Flag[] {
  return dbQueries.getAllFlags.all() as Flag[];
}

/**
 * Get flag by ID
 */
export function getFlagById(id: number): Flag | null {
  return dbQueries.getFlagById.get(id) as Flag | null;
}

/**
 * Create a flag
 */
export function createFlag(name: string, color?: string): Flag {
  const result = dbQueries.insertFlag.run(name, color || null);
  return dbQueries.getFlagById.get(result.lastInsertRowid as number) as Flag;
}

/**
 * Update a flag
 */
export function updateFlag(id: number, name?: string, color?: string): Flag | null {
  const existing = dbQueries.getFlagById.get(id) as Flag | null;
  if (!existing) return null;

  const updatedName = name !== undefined ? name : existing.name;
  const updatedColor = color !== undefined ? color : existing.color;

  dbQueries.updateFlag.run(updatedName, updatedColor || null, id);
  return dbQueries.getFlagById.get(id) as Flag;
}

/**
 * Delete a flag
 */
export function deleteFlag(id: number): boolean {
  const flag = dbQueries.getFlagById.get(id) as Flag | null;
  if (!flag) return false;

  dbQueries.deleteFlag.run(id);
  return true;
}

/**
 * Get settings
 */
export function getSetting(key: string): string | null {
  const result = dbQueries.getSetting.get(key) as { value: string } | undefined;
  return result?.value || null;
}

/**
 * Set setting
 */
export function setSetting(key: string, value: string): void {
  dbQueries.setSetting.run(key, value);
}

/**
 * Get all settings
 */
export function getAllSettings(): Record<string, string> {
  const results = dbQueries.getAllSettings.all() as Array<{ key: string; value: string }>;
  return results.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>);
}

