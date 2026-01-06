export interface Receipt {
  id: number;
  user: string;
  type: string;
  amount: number;
  vendor: string;
  provider_address: string;
  description: string;
  date: string; // ISO date string
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ReceiptFile {
  id: number;
  receipt_id: number;
  filename: string;
  original_filename: string;
  file_order: number;
  created_at: string;
}

export interface Flag {
  id: number;
  name: string;
  color?: string;
  created_at: string;
}

export interface ReceiptWithFiles extends Receipt {
  files: ReceiptFile[];
  flags: Flag[];
}

export interface CreateReceiptInput {
  user?: string;
  type?: string;
  amount?: number;
  vendor?: string;
  provider_address?: string;
  description?: string;
  date?: string;
  notes?: string;
  flag_ids?: number[];
}

export interface UpdateReceiptInput {
  user?: string;
  type?: string;
  amount?: number;
  vendor?: string;
  provider_address?: string;
  description?: string;
  date?: string;
  notes?: string;
  flag_ids?: number[];
}

export interface CreateFlagInput {
  name: string;
  color?: string;
}

export interface UpdateFlagInput {
  name?: string;
  color?: string;
}

