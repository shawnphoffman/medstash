/**
 * Default receipt type groups and ungrouped types configuration
 * Used for initializing and resetting receipt types to defaults
 */

export interface DefaultReceiptTypeGroup {
	name: string
	display_order: number
	types: string[]
}

/**
 * Default receipt type groups
 */
export const DEFAULT_RECEIPT_TYPE_GROUPS: DefaultReceiptTypeGroup[] = [
	{
		name: 'Medical Expenses',
		display_order: 0,
		types: ['Doctor Visits', 'Hospital Services', 'Prescription Medications', 'Over-the-Counter Medications'],
	},
	{ name: 'Dental Expenses', display_order: 1, types: ['Routine Dental', 'Major Dental'] },
	{ name: 'Vision Expenses', display_order: 2, types: ['Eye Exams', 'Eyewear', 'Contact Lenses'] },
]

/**
 * Default ungrouped receipt types
 */
export const DEFAULT_UNGROUPED_TYPES: string[] = ['Family Planning', 'Mental Health Services', 'Other']
