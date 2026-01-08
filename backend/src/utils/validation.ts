/**
 * Input validation utilities
 */

const MAX_STRING_LENGTH = 500
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_VENDOR_LENGTH = 200
const MAX_AMOUNT = 999999.99

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDate(dateString: string): { valid: boolean; error?: string } {
	if (!dateString || typeof dateString !== 'string') {
		return { valid: false, error: 'Date is required and must be a string' }
	}

	// Check format YYYY-MM-DD
	const dateRegex = /^\d{4}-\d{2}-\d{2}$/
	if (!dateRegex.test(dateString)) {
		return { valid: false, error: 'Date must be in YYYY-MM-DD format' }
	}

	// Check if it's a valid date
	const date = new Date(dateString)
	if (isNaN(date.getTime())) {
		return { valid: false, error: 'Invalid date' }
	}

	// Check if date is not in the future (reasonable for receipts)
	const today = new Date()
	today.setHours(23, 59, 59, 999) // End of today
	if (date > today) {
		return { valid: false, error: 'Date cannot be in the future' }
	}

	return { valid: true }
}

/**
 * Validate string length
 */
export function validateStringLength(
	value: string | undefined,
	fieldName: string,
	maxLength: number,
	required = false
): { valid: boolean; error?: string } {
	if (value === undefined || value === null) {
		if (required) {
			return { valid: false, error: `${fieldName} is required` }
		}
		return { valid: true }
	}

	if (typeof value !== 'string') {
		return { valid: false, error: `${fieldName} must be a string` }
	}

	if (value.length > maxLength) {
		return { valid: false, error: `${fieldName} must be ${maxLength} characters or less` }
	}

	return { valid: true }
}

/**
 * Validate amount
 */
export function validateAmount(amount: number | undefined): { valid: boolean; error?: string } {
	if (amount === undefined || amount === null) {
		return { valid: true } // Amount is optional
	}

	if (typeof amount !== 'number' || isNaN(amount)) {
		return { valid: false, error: 'Amount must be a number' }
	}

	if (amount < 0) {
		return { valid: false, error: 'Amount cannot be negative' }
	}

	if (amount > MAX_AMOUNT) {
		return { valid: false, error: `Amount cannot exceed ${MAX_AMOUNT.toLocaleString()}` }
	}

	// Check decimal places (max 2)
	const decimalPlaces = (amount.toString().split('.')[1] || '').length
	if (decimalPlaces > 2) {
		return { valid: false, error: 'Amount cannot have more than 2 decimal places' }
	}

	return { valid: true }
}

/**
 * Validate vendor field
 */
export function validateVendor(vendor: string | undefined): { valid: boolean; error?: string } {
	return validateStringLength(vendor, 'Vendor', MAX_VENDOR_LENGTH, false)
}

/**
 * Validate description field
 */
export function validateDescription(description: string | undefined): { valid: boolean; error?: string } {
	return validateStringLength(description, 'Description', MAX_DESCRIPTION_LENGTH, false)
}

/**
 * Validate provider address field
 */
export function validateProviderAddress(address: string | undefined): { valid: boolean; error?: string } {
	return validateStringLength(address, 'Provider address', MAX_STRING_LENGTH, false)
}
