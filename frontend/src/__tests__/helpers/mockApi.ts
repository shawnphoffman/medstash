import { vi } from 'vitest';
import * as apiModule from '../../lib/api';

/**
 * Mock API responses for testing
 */
export function mockApi() {
  const mockReceiptsApi = {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addFiles: vi.fn(),
    downloadFile: vi.fn(),
    deleteFile: vi.fn(),
    updateFlags: vi.fn(),
  };

  const mockFlagsApi = {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockSettingsApi = {
    getAll: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  };

  const mockExportApi = {
    download: vi.fn(),
  };

  vi.spyOn(apiModule, 'receiptsApi').mockReturnValue(mockReceiptsApi as any);
  vi.spyOn(apiModule, 'flagsApi').mockReturnValue(mockFlagsApi as any);
  vi.spyOn(apiModule, 'settingsApi').mockReturnValue(mockSettingsApi as any);
  vi.spyOn(apiModule, 'exportApi').mockReturnValue(mockExportApi as any);

  return {
    receiptsApi: mockReceiptsApi,
    flagsApi: mockFlagsApi,
    settingsApi: mockSettingsApi,
    exportApi: mockExportApi,
  };
}

