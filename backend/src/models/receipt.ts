export interface User {
	id: number
	name: string
	created_at: string
}

export interface ReceiptTypeGroup {
	id: number
	name: string
	display_order: number
	created_at: string
}

export interface ReceiptType {
	id: number
	name: string
	group_id?: number | null
	display_order: number
	created_at: string
	// Optional fields from join
	group_name?: string
	group_display_order?: number
}

export interface Receipt {
	id: number
	user_id: number
	receipt_type_id: number
	amount: number
	vendor: string
	provider_address: string
	description: string
	date: string // ISO date string
	notes?: string
	created_at: string
	updated_at: string
}

export interface ReceiptFile {
	id: number
	receipt_id: number
	filename: string
	original_filename: string
	file_order: number
	created_at: string
	is_optimized?: number // 0 = false, 1 = true (SQLite boolean)
	optimized_at?: string | null // Timestamp when optimized
}

export interface Flag {
	id: number
	name: string
	color?: string
	created_at: string
}

export interface ReceiptWithFiles extends Receipt {
	files: ReceiptFile[]
	flags: Flag[]
	user?: User
	receipt_type?: ReceiptType
}

// API response type that includes user and type names for backward compatibility
export interface ReceiptWithNames extends Omit<Receipt, 'user_id' | 'receipt_type_id'> {
	user: string // user name for API compatibility
	type: string // receipt type name for API compatibility
	user_id: number
	receipt_type_id: number
}

export interface ReceiptWithFilesAndNames extends ReceiptWithNames {
	files: ReceiptFile[]
	flags: Flag[]
}

export interface CreateReceiptInput {
	user_id?: number
	receipt_type_id?: number
	amount?: number
	vendor?: string
	provider_address?: string
	description?: string
	date?: string
	notes?: string
	flag_ids?: number[]
	// Legacy support: accept user/type as strings and resolve to IDs
	user?: string
	type?: string
}

export interface UpdateReceiptInput {
	user_id?: number
	receipt_type_id?: number
	amount?: number
	vendor?: string
	provider_address?: string
	description?: string
	date?: string
	notes?: string
	flag_ids?: number[]
	// Legacy support: accept user/type as strings and resolve to IDs
	user?: string
	type?: string
}

export interface CreateUserInput {
	name: string
}

export interface UpdateUserInput {
	name?: string
}

export interface CreateReceiptTypeGroupInput {
	name: string
	display_order?: number
}

export interface UpdateReceiptTypeGroupInput {
	name?: string
	display_order?: number
}

export interface CreateReceiptTypeInput {
	name: string
	group_id?: number | null
	display_order?: number
}

export interface UpdateReceiptTypeInput {
	name?: string
	group_id?: number | null
	display_order?: number
}

export interface CreateFlagInput {
	name: string
	color?: string
}

export interface UpdateFlagInput {
	name?: string
	color?: string
}
