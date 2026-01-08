/**
 * Input sanitization utilities
 * Removes potentially dangerous content from user inputs to prevent XSS attacks
 */

/**
 * Sanitize a string by removing HTML tags and escaping special characters
 * This prevents XSS attacks when data is displayed in the frontend
 */
export function sanitizeString(input: string | undefined | null): string {
	if (!input || typeof input !== 'string') {
		return ''
	}

	// Remove null bytes and control characters (except newlines, tabs, carriage returns)
	let sanitized = input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')

	// Remove HTML tags (basic protection)
	// This regex removes <...> tags but keeps the content
	sanitized = sanitized.replace(/<[^>]*>/g, '')

	// Remove script tags and their content (case insensitive)
	sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

	// Remove style tags and their content (case insensitive)
	sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

	// Remove javascript: and data: protocols
	sanitized = sanitized.replace(/javascript:/gi, '')
	sanitized = sanitized.replace(/data:/gi, '')

	// Normalize whitespace (collapse multiple spaces/tabs into single space, preserve newlines)
	sanitized = sanitized.replace(/[ \t]+/g, ' ')

	// Trim leading and trailing whitespace
	sanitized = sanitized.trim()

	return sanitized
}

/**
 * Sanitize an optional string field
 */
export function sanitizeOptionalString(input: string | undefined | null): string | null {
	if (!input) {
		return null
	}
	const sanitized = sanitizeString(input)
	return sanitized === '' ? null : sanitized
}
