import axios, { AxiosError } from 'axios';
import type { ErrorType } from '../pages/ErrorPage';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Error handler that can be set from outside
let errorHandler: ((type: ErrorType, message?: string) => void) | null = null;

export function setApiErrorHandler(handler: (type: ErrorType, message?: string) => void) {
  errorHandler = handler;
}

// Helper to detect error type
function detectErrorType(error: AxiosError): ErrorType {
  // CORS errors typically have no response and network error
  if (!error.response && error.message) {
    if (
      error.message.includes('CORS') ||
      error.message.includes('cors') ||
      error.message.includes('Network Error') ||
      error.code === 'ERR_NETWORK'
    ) {
      // Check if it's specifically a CORS issue
      if (error.message.includes('CORS') || error.message.includes('cors')) {
        return 'cors';
      }
      return 'network';
    }
  }

  // Server errors (5xx)
  if (error.response && error.response.status >= 500) {
    return 'server';
  }

  // Network errors
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
    return 'network';
  }

  return 'unknown';
}

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Only handle critical errors that should show the error page
    const errorType = detectErrorType(error);
    
    // CORS and network errors are critical and should show error page
    if (errorType === 'cors' || errorType === 'network') {
      const message = error.response?.data 
        ? (error.response.data as any)?.error || error.message
        : error.message || 'Unable to connect to the server';
      
      if (errorHandler) {
        errorHandler(errorType, message);
      }
    }
    
    // For server errors, we might want to show error page on critical endpoints
    // For now, let individual components handle 5xx errors
    // But we can trigger error page for repeated server errors
    
    return Promise.reject(error);
  }
);

export interface User {
  id: number;
  name: string;
  created_at: string;
}

export interface ReceiptTypeGroup {
  id: number;
  name: string;
  display_order: number;
  created_at: string;
}

export interface ReceiptType {
  id: number;
  name: string;
  group_id?: number | null;
  display_order: number;
  created_at: string;
  // Optional fields from join
  group_name?: string;
  group_display_order?: number;
}

export interface Receipt {
  id: number;
  user_id: number;
  receipt_type_id: number;
  user: string; // user name for backward compatibility
  type: string; // receipt type name for backward compatibility
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
  user_id?: number;
  receipt_type_id?: number;
  amount?: number;
  vendor?: string;
  provider_address?: string;
  description?: string;
  date?: string;
  notes?: string;
  flag_ids?: number[];
}

export interface UpdateReceiptInput {
  user_id?: number;
  receipt_type_id?: number;
  amount?: number;
  vendor?: string;
  provider_address?: string;
  description?: string;
  date?: string;
  notes?: string;
  flag_ids?: number[];
}

export interface BulkUpdateReceiptInput {
  vendor?: string;
  date?: string;
  user_id?: number;
  receipt_type_id?: number;
  flag_ids?: number[];
  flag_operation?: 'append' | 'replace';
}

export interface CreateFlagInput {
  name: string;
  color?: string;
}

export interface CreateUserInput {
  name: string;
}

export interface UpdateUserInput {
  name?: string;
}

export interface CreateReceiptTypeGroupInput {
  name: string;
  display_order?: number;
}

export interface UpdateReceiptTypeGroupInput {
  name?: string;
  display_order?: number;
}

export interface CreateReceiptTypeInput {
  name: string;
  group_id?: number | null;
  display_order?: number;
}

export interface UpdateReceiptTypeInput {
  name?: string;
  group_id?: number | null;
  display_order?: number;
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
    if (data.user_id !== undefined) formData.append('user_id', data.user_id.toString());
    if (data.receipt_type_id !== undefined) formData.append('receipt_type_id', data.receipt_type_id.toString());
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
    // Note: user and type are still strings here for filename generation
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
  replaceFile: (receiptId: number, fileId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.put<Receipt>(`/receipts/${receiptId}/files/${fileId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateFlags: (id: number, flagIds: number[]) => {
    return api.put<Receipt>(`/receipts/${id}/flags`, { flag_ids: flagIds });
  },
  bulkUpdate: (ids: number[], data: BulkUpdateReceiptInput) => {
    return api.post<{ updated: number; errors: Array<{ id: number; error: string }> }>('/receipts/bulk-update', {
      receipt_ids: ids,
      ...data
    });
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

// Users API
export const usersApi = {
  getAll: () => api.get<User[]>('/users'),
  getById: (id: number) => api.get<User>(`/users/${id}`),
  create: (data: CreateUserInput) => api.post<User>('/users', data),
  update: (id: number, data: UpdateUserInput) =>
    api.put<User>(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

// Receipt Type Groups API
export const receiptTypeGroupsApi = {
  getAll: () => api.get<ReceiptTypeGroup[]>('/receipt-type-groups'),
  getById: (id: number) => api.get<ReceiptTypeGroup>(`/receipt-type-groups/${id}`),
  create: (data: CreateReceiptTypeGroupInput) => api.post<ReceiptTypeGroup>('/receipt-type-groups', data),
  update: (id: number, data: UpdateReceiptTypeGroupInput) =>
    api.put<ReceiptTypeGroup>(`/receipt-type-groups/${id}`, data),
  delete: (id: number) => api.delete(`/receipt-type-groups/${id}`),
};

// Receipt Types API
export const receiptTypesApi = {
  getAll: () => api.get<ReceiptType[]>('/receipt-types'),
  getById: (id: number) => api.get<ReceiptType>(`/receipt-types/${id}`),
  create: (data: CreateReceiptTypeInput) => api.post<ReceiptType>('/receipt-types', data),
  update: (id: number, data: UpdateReceiptTypeInput) =>
    api.put<ReceiptType>(`/receipt-types/${id}`, data),
  move: (id: number, groupId: number | null, displayOrder?: number) =>
    api.put<ReceiptType>(`/receipt-types/${id}/move`, { group_id: groupId, display_order: displayOrder }),
  delete: (id: number) => api.delete(`/receipt-types/${id}`),
  bulkUpdate: (updates: Array<{ id: number; group_id: number | null; display_order: number }>) =>
    api.post<ReceiptType[]>('/receipt-types/bulk-update', { updates }),
  resetToDefaults: (defaultGroups: Array<{ name: string; display_order: number; types: string[] }>, ungroupedTypes?: string[]) =>
    api.post<{ groups: ReceiptTypeGroup[]; types: ReceiptType[] }>('/receipt-types/reset-to-defaults', {
      defaultGroups,
      ungroupedTypes,
    }),
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

