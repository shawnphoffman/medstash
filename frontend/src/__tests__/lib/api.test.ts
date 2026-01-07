import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import {
  receiptsApi,
  flagsApi,
  settingsApi,
  exportApi,
  type CreateReceiptInput,
  type UpdateReceiptInput,
  type CreateFlagInput,
} from '../../lib/api';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('receiptsApi', () => {
    describe('getAll', () => {
      it('should fetch all receipts', async () => {
        const mockReceipts = [{ id: 1, vendor: 'Test' }];
        mockedAxios.create.mockReturnValue({
          get: vi.fn().mockResolvedValue({ data: mockReceipts }),
        });

        const api = axios.create();
        const response = await api.get('/receipts');
        expect(response.data).toEqual(mockReceipts);
      });

      it('should include flag_id in params when provided', async () => {
        const mockGet = vi.fn().mockResolvedValue({ data: [] });
        mockedAxios.create.mockReturnValue({
          get: mockGet,
        });

        const api = axios.create();
        await api.get('/receipts', { params: { flag_id: 1 } });
        expect(mockGet).toHaveBeenCalledWith('/receipts', { params: { flag_id: 1 } });
      });
    });

    describe('getById', () => {
      it('should fetch receipt by ID', async () => {
        const mockReceipt = { id: 1, vendor: 'Test' };
        const mockGet = vi.fn().mockResolvedValue({ data: mockReceipt });
        mockedAxios.create.mockReturnValue({
          get: mockGet,
        });

        const api = axios.create();
        const response = await api.get('/receipts/1');
        expect(response.data).toEqual(mockReceipt);
      });
    });

    describe('create', () => {
      it('should create receipt with FormData', async () => {
        const mockReceipt = { id: 1, vendor: 'Test' };
        const mockPost = vi.fn().mockResolvedValue({ data: mockReceipt });
        mockedAxios.create.mockReturnValue({
          post: mockPost,
        });

        const api = axios.create();
        const formData = new FormData();
        formData.append('user', 'Test User');
        formData.append('files', new File([''], 'test.pdf'));

        await api.post('/receipts', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        expect(mockPost).toHaveBeenCalled();
        const callArgs = mockPost.mock.calls[0];
        expect(callArgs[0]).toBe('/receipts');
        expect(callArgs[1]).toBeInstanceOf(FormData);
      });

      it('should include flag_ids in FormData', async () => {
        const mockPost = vi.fn().mockResolvedValue({ data: { id: 1 } });
        mockedAxios.create.mockReturnValue({
          post: mockPost,
        });

        const api = axios.create();
        const formData = new FormData();
        formData.append('files', new File([''], 'test.pdf'));
        formData.append('flag_ids', JSON.stringify([1, 2]));

        await api.post('/receipts', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        expect(mockPost).toHaveBeenCalled();
      });
    });

    describe('update', () => {
      it('should update receipt', async () => {
        const mockReceipt = { id: 1, vendor: 'Updated' };
        const mockPut = vi.fn().mockResolvedValue({ data: mockReceipt });
        mockedAxios.create.mockReturnValue({
          put: mockPut,
        });

        const api = axios.create();
        await api.put('/receipts/1', { vendor: 'Updated' });
        expect(mockPut).toHaveBeenCalledWith('/receipts/1', { vendor: 'Updated' });
      });
    });

    describe('delete', () => {
      it('should delete receipt', async () => {
        const mockDelete = vi.fn().mockResolvedValue({ status: 204 });
        mockedAxios.create.mockReturnValue({
          delete: mockDelete,
        });

        const api = axios.create();
        await api.delete('/receipts/1');
        expect(mockDelete).toHaveBeenCalledWith('/receipts/1');
      });
    });

    describe('addFiles', () => {
      it('should add files to receipt', async () => {
        const mockPost = vi.fn().mockResolvedValue({ data: { id: 1 } });
        mockedAxios.create.mockReturnValue({
          post: mockPost,
        });

        const api = axios.create();
        const formData = new FormData();
        formData.append('files', new File([''], 'test.pdf'));

        await api.post('/receipts/1/files', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        expect(mockPost).toHaveBeenCalled();
      });
    });

    describe('downloadFile', () => {
      it('should download file as blob', async () => {
        const mockGet = vi.fn().mockResolvedValue({ data: new Blob() });
        mockedAxios.create.mockReturnValue({
          get: mockGet,
        });

        const api = axios.create();
        await api.get('/receipts/1/files/1', { responseType: 'blob' });
        expect(mockGet).toHaveBeenCalledWith('/receipts/1/files/1', {
          responseType: 'blob',
        });
      });
    });

    describe('updateFlags', () => {
      it('should update receipt flags', async () => {
        const mockPut = vi.fn().mockResolvedValue({ data: { id: 1 } });
        mockedAxios.create.mockReturnValue({
          put: mockPut,
        });

        const api = axios.create();
        await api.put('/receipts/1/flags', { flag_ids: [1, 2] });
        expect(mockPut).toHaveBeenCalledWith('/receipts/1/flags', { flag_ids: [1, 2] });
      });
    });
  });

  describe('flagsApi', () => {
    describe('getAll', () => {
      it('should fetch all flags', async () => {
        const mockFlags = [{ id: 1, name: 'Flag 1' }];
        const mockGet = vi.fn().mockResolvedValue({ data: mockFlags });
        mockedAxios.create.mockReturnValue({
          get: mockGet,
        });

        const api = axios.create();
        const response = await api.get('/flags');
        expect(response.data).toEqual(mockFlags);
      });
    });

    describe('create', () => {
      it('should create flag', async () => {
        const mockFlag = { id: 1, name: 'New Flag' };
        const mockPost = vi.fn().mockResolvedValue({ data: mockFlag });
        mockedAxios.create.mockReturnValue({
          post: mockPost,
        });

        const api = axios.create();
        await api.post('/flags', { name: 'New Flag' });
        expect(mockPost).toHaveBeenCalledWith('/flags', { name: 'New Flag' });
      });
    });

    describe('update', () => {
      it('should update flag', async () => {
        const mockPut = vi.fn().mockResolvedValue({ data: { id: 1, name: 'Updated' } });
        mockedAxios.create.mockReturnValue({
          put: mockPut,
        });

        const api = axios.create();
        await api.put('/flags/1', { name: 'Updated' });
        expect(mockPut).toHaveBeenCalledWith('/flags/1', { name: 'Updated' });
      });
    });

    describe('delete', () => {
      it('should delete flag', async () => {
        const mockDelete = vi.fn().mockResolvedValue({ status: 204 });
        mockedAxios.create.mockReturnValue({
          delete: mockDelete,
        });

        const api = axios.create();
        await api.delete('/flags/1');
        expect(mockDelete).toHaveBeenCalledWith('/flags/1');
      });
    });
  });

  describe('settingsApi', () => {
    describe('getAll', () => {
      it('should fetch all settings', async () => {
        const mockSettings = { key1: 'value1' };
        const mockGet = vi.fn().mockResolvedValue({ data: mockSettings });
        mockedAxios.create.mockReturnValue({
          get: mockGet,
        });

        const api = axios.create();
        const response = await api.get('/settings');
        expect(response.data).toEqual(mockSettings);
      });
    });

    describe('get', () => {
      it('should fetch specific setting', async () => {
        const mockSetting = { key: 'test', value: 'value' };
        const mockGet = vi.fn().mockResolvedValue({ data: mockSetting });
        mockedAxios.create.mockReturnValue({
          get: mockGet,
        });

        const api = axios.create();
        await api.get('/settings/test');
        expect(mockGet).toHaveBeenCalledWith('/settings/test');
      });
    });

    describe('set', () => {
      it('should set setting', async () => {
        const mockPut = vi.fn().mockResolvedValue({ data: { key: 'test', value: 'value' } });
        mockedAxios.create.mockReturnValue({
          put: mockPut,
        });

        const api = axios.create();
        await api.put('/settings/test', { value: 'value' });
        expect(mockPut).toHaveBeenCalledWith('/settings/test', { value: 'value' });
      });
    });
  });

  describe('exportApi', () => {
    describe('download', () => {
      it('should download export as blob', async () => {
        const mockGet = vi.fn().mockResolvedValue({ data: new Blob() });
        mockedAxios.create.mockReturnValue({
          get: mockGet,
        });

        const api = axios.create();
        await api.get('/export', { responseType: 'blob' });
        expect(mockGet).toHaveBeenCalledWith('/export', { responseType: 'blob' });
      });
    });
  });
});

