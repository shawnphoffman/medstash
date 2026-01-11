import { Flag } from '../models/receipt'
import { getSetting } from '../services/dbService'
import { logger } from './logger'

const DEFAULT_PATTERN = '{date}_{user}_{vendor}_{amount}_{type}_{index}'

/**
 * Validate a filename pattern
 * Returns { valid: boolean, error?: string }
 */
export function validatePattern(pattern: string): { valid: boolean; error?: string } {
	if (!pattern || pattern.trim().length === 0) {
		return { valid: false, error: 'Pattern cannot be empty' }
	}

	// Check for invalid filesystem characters
	const invalidChars = /[<>:"/\\|?*]/
	if (invalidChars.test(pattern)) {
		return { valid: false, error: 'Pattern contains invalid filesystem characters: < > : " / \\ | ? *' }
	}

	// Check for reserved Windows names (case-insensitive)
	const reservedNames = [
		'CON',
		'PRN',
		'AUX',
		'NUL',
		'COM1',
		'COM2',
		'COM3',
		'COM4',
		'COM5',
		'COM6',
		'COM7',
		'COM8',
		'COM9',
		'LPT1',
		'LPT2',
		'LPT3',
		'LPT4',
		'LPT5',
		'LPT6',
		'LPT7',
		'LPT8',
		'LPT9',
	]
	const upperPattern = pattern.toUpperCase()
	for (const reserved of reservedNames) {
		if (upperPattern.includes(reserved)) {
			return { valid: false, error: `Pattern contains reserved name: ${reserved}` }
		}
	}

	// Reject pattern if it contains {ext} token (extension is auto-appended)
	if (pattern.includes('{ext}')) {
		return { valid: false, error: 'Pattern cannot contain {ext} token. File extension is automatically appended.' }
	}

	// Check for valid tokens only
	const validTokens = ['date', 'user', 'vendor', 'amount', 'type', 'index', 'flags']
	const tokenRegex = /\{([^}]+)\}/g
	let match
	while ((match = tokenRegex.exec(pattern)) !== null) {
		const token = match[1]
		if (!validTokens.includes(token)) {
			return {
				valid: false,
				error: `Unknown token: {${token}}. Valid tokens are: {date}, {user}, {vendor}, {amount}, {type}, {index}, {flags}`,
			}
		}
	}

	// Check for reasonable length (pattern itself, before token replacement)
	if (pattern.length > 200) {
		return { valid: false, error: 'Pattern is too long (max 200 characters)' }
	}

	// Check for leading/trailing spaces or dots
	if (pattern.trim() !== pattern) {
		return { valid: false, error: 'Pattern cannot have leading or trailing spaces' }
	}

	if (pattern.startsWith('.') || pattern.endsWith('.')) {
		return { valid: false, error: 'Pattern cannot start or end with a dot' }
	}

	return { valid: true }
}

/**
 * Format flags for filename (dash-separated, sanitized)
 */
function formatFlags(flags: Flag[]): string {
	if (!flags || flags.length === 0) {
		return ''
	}
	return flags
		.map(flag => sanitizeFilename(flag.name))
		.filter(name => name && name !== 'unknown')
		.join('-')
}

/**
 * Generate a sanitized filename for a receipt file using a customizable pattern
 * Format: Uses pattern from settings or default pattern, extension is automatically appended
 * Always appends [{receiptId}-{index}] before the extension to prevent filename collisions
 */
export function generateReceiptFilename(
	date: string,
	user: string,
	vendor: string,
	amount: number,
	type: string,
	index: number,
	originalExtension: string,
	receiptId: number,
	flags?: Flag[],
	pattern?: string
): string {
	// Get pattern from parameter, settings, or use default
	let usedPattern = pattern || DEFAULT_PATTERN
	if (!pattern) {
		const setting = getSetting('filenamePattern')
		if (setting) {
			try {
				usedPattern = JSON.parse(setting)
			} catch (parseError) {
				// If JSON parsing fails, use default pattern
				logger.warn('Failed to parse filenamePattern setting, using default:', parseError)
				usedPattern = DEFAULT_PATTERN
			}
		}
	}

	// Sanitize inputs
	const sanitizedUser = sanitizeFilename(user)
	const sanitizedVendor = sanitizeFilename(vendor)
	const sanitizedType = sanitizeFilename(type)

	// Format date as YYYY-MM-DD
	const dateStr = date.split('T')[0] // Extract date part from ISO string

	// Format amount with 2 decimal places, replace . with dash for filename
	const amountStr = amount.toFixed(2).replace('.', '-')

	// Format flags (dash-separated)
	const flagsStr = formatFlags(flags || [])

	// Replace tokens in pattern
	let filename = usedPattern
		.replace(/\{date\}/g, dateStr)
		.replace(/\{user\}/g, sanitizedUser)
		.replace(/\{vendor\}/g, sanitizedVendor)
		.replace(/\{amount\}/g, amountStr)
		.replace(/\{type\}/g, sanitizedType)
		.replace(/\{index\}/g, index.toString())
		.replace(/\{flags\}/g, flagsStr)

	// Clean up any double separators that might result from empty flags
	filename = filename.replace(/-+/g, '-').replace(/_+/g, '_')
	// Remove leading/trailing separators
	filename = filename.replace(/^[-_]+|[-_]+$/g, '')

	// Get extension (ensure it starts with .)
	const ext = originalExtension.startsWith('.') ? originalExtension : `.${originalExtension}`

	// Always append [{receiptId}-{index}] before extension to prevent filename collisions
	// This ensures unique filenames even if pattern generates identical names
	const uniqueSuffix = `[${receiptId}-${index}]`

	// Append unique suffix and extension
	return `${filename}${uniqueSuffix}${ext}`
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
		return 'unknown'
	}
	return input
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9\-_]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.substring(0, 50) // Limit length
}
