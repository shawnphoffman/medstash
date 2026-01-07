import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export interface Receipt {
  id: number;
  user: string;
  type: string;
  amount: number;
  vendor: string;
  provider_address: string;
  description: string;
  date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  files: ReceiptFile[];
  flags: Flag[];
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

// Receipts API
export const receiptsApi = {
  getAll: (flagId?: number) => {
    const params = flagId ? { flag_id: flagId } : {};
    return api.get<Receipt[]>('/receipts', { params });
  },
  getById: (id: number) => api.get<Receipt>(`/receipts/${id}`),
  create: (data: CreateReceiptInput, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    // Append all fields, even if empty - backend will handle defaults
    formData.append('user', data.user || '');
    formData.append('type', data.type || '');
    formData.append('amount', (data.amount !== undefined ? data.amount : 0).toString());
    formData.append('vendor', data.vendor || '');
    formData.append('provider_address', data.provider_address || '');
    formData.append('description', data.description || '');
    formData.append('date', data.date || '');
    if (data.notes) formData.append('notes', data.notes);
    if (data.flag_ids && data.flag_ids.length > 0) {
      formData.append('flag_ids', JSON.stringify(data.flag_ids));
    }
    return api.post<Receipt>('/receipts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id: number, data: UpdateReceiptInput) => {
    const body: any = { ...data };
    if (data.flag_ids) {
      body.flag_ids = data.flag_ids;
    }
    return api.put<Receipt>(`/receipts/${id}`, body);
  },
  delete: (id: number) => api.delete(`/receipts/${id}`),
  addFiles: (id: number, files: File[], receiptData?: { date?: string; user?: string; vendor?: string; amount?: number; type?: string }) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    // Add receipt data if provided (for proper file naming)
    if (receiptData) {
      if (receiptData.date) formData.append('date', receiptData.date);
      if (receiptData.user) formData.append('user', receiptData.user);
      if (receiptData.vendor) formData.append('vendor', receiptData.vendor);
      if (receiptData.amount !== undefined) formData.append('amount', receiptData.amount.toString());
      if (receiptData.type) formData.append('type', receiptData.type);
    }

    return api.post<Receipt>(`/receipts/${id}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadFile: (receiptId: number, fileId: number) => {
    return api.get(`/receipts/${receiptId}/files/${fileId}`, {
      responseType: 'blob',
    });
  },
  deleteFile: (receiptId: number, fileId: number) => {
    return api.delete<Receipt>(`/receipts/${receiptId}/files/${fileId}`);
  },
  updateFlags: (id: number, flagIds: number[]) => {
    return api.put<Receipt>(`/receipts/${id}/flags`, { flag_ids: flagIds });
  },
};

// Flags API
export const flagsApi = {
  getAll: () => api.get<Flag[]>('/flags'),
  getById: (id: number) => api.get<Flag>(`/flags/${id}`),
  create: (data: CreateFlagInput) => api.post<Flag>('/flags', data),
  update: (id: number, data: Partial<CreateFlagInput>) =>
    api.put<Flag>(`/flags/${id}`, data),
  delete: (id: number) => api.delete(`/flags/${id}`),
};

// Settings API
export const settingsApi = {
  getAll: () => api.get<Record<string, any>>('/settings'),
  get: (key: string) => api.get<{ key: string; value: any }>(`/settings/${key}`),
  set: (key: string, value: any) =>
    api.put<{ key: string; value: any }>(`/settings/${key}`, { value }),
};

// Export API
export const exportApi = {
  download: () => {
    return api.get('/export', {
      responseType: 'blob',
    });
  },
};

// Filenames API
export const filenamesApi = {
  renameAll: () => api.post<{
    success: boolean;
    totalReceipts: number;
    totalFiles: number;
    renamed: number;
    errors: Array<{ receiptId: number; error: string }>;
  }>('/filenames/rename-all'),
};

export default api;

