/**
 * Generate a sanitized filename for a receipt file
 * Format: YYYY-MM-DD_user_vendor_amount_type_{index}.ext
 */
export function generateReceiptFilename(
  date: string,
  user: string,
  vendor: string,
  amount: number,
  type: string,
  index: number,
  originalExtension: string
): string {
  // Sanitize inputs
  const sanitizedUser = sanitizeFilename(user);
  const sanitizedVendor = sanitizeFilename(vendor);
  const sanitizedType = sanitizeFilename(type);

  // Format date as YYYY-MM-DD
  const dateStr = date.split('T')[0]; // Extract date part from ISO string

  // Format amount with 2 decimal places, replace . with dash for filename
  const amountStr = amount.toFixed(2).replace('.', '-');

  // Get extension (ensure it starts with .)
  const ext = originalExtension.startsWith('.')
    ? originalExtension
    : `.${originalExtension}`;

  return `${dateStr}_${sanitizedUser}_${sanitizedVendor}_${amountStr}_${sanitizedType}_${index}${ext}`;
}

/**
 * Sanitize a string for use in filenames
 * - Convert to lowercase
 * - Replace spaces with hyphens
 * - Remove special characters (keep alphanumeric, hyphens, underscores)
 * - Limit length
 */
export function sanitizeFilename(input: string): string {
  if (!input || input.trim().length === 0) {
    return 'unknown';
  }
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50); // Limit length
}

