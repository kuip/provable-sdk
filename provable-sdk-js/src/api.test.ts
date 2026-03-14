/**
 * Tests for API module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prove_single_hash, get_record_by_hash } from './api';
import {
  getKayrosUrl,
  API_ROUTES,
  DATA_TYPE,
  getRecordUrl,
  DEFAULT_API_KEY,
  DEFAULT_USER_KEY,
  setApiKey,
  setUserKey,
} from './config';

// Mock fetch globally
global.fetch = vi.fn();

describe('api', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setUserKey(DEFAULT_USER_KEY);
  });

  describe('prove_single_hash', () => {
    it('should call API with default data_type', async () => {
      const mockResponse = {
        success: true,
        hash: 'abc123',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await prove_single_hash('test_hash');

      expect(global.fetch).toHaveBeenCalledWith(
        getKayrosUrl(API_ROUTES.PROVE_SINGLE_HASH),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-User-Key': DEFAULT_USER_KEY,
          }),
          body: JSON.stringify({
            data_item: 'test_hash',
            data_type: DATA_TYPE,
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should call API with custom data_type', async () => {
      const customDataType = 'provable_forms';
      const mockResponse = {
        success: true,
        hash: 'def456',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await prove_single_hash('test_hash', customDataType);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            data_item: 'test_hash',
            data_type: customDataType,
          }),
        })
      );
    });

    it('should allow overriding the api key per request', async () => {
      const mockResponse = {
        success: true,
        hash: 'ghi789',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await prove_single_hash('test_hash', {
        dataType: 'provable_custom',
        apiKey: 'private-key-123',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        getKayrosUrl(API_ROUTES.PROVE_SINGLE_HASH),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-User-Key': 'private-key-123',
          }),
          body: JSON.stringify({
            data_item: 'test_hash',
            data_type: 'provable_custom',
          }),
        })
      );
    });

    it('should throw error when API returns error status', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(
        prove_single_hash('test_hash')
      ).rejects.toThrow('Kayros API error: 500 Internal Server Error');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        prove_single_hash('test_hash')
      ).rejects.toThrow('Network error');
    });
  });

  describe('get_record_by_hash', () => {
    it('should call API with correct URL', async () => {
      const mockResponse = {
        data_item: 'abc123',
        data_type: 'provable_sdk',
        hash_item: 'def456',
        hash_type: 'sha3_256',
        position: 1,
        ts: '2024-01-01T00:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await get_record_by_hash('record_hash_123', DATA_TYPE);
      const expectedUrl = getRecordUrl('record_hash_123', DATA_TYPE);

      expect(global.fetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-User-Key': DEFAULT_USER_KEY,
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when API returns error status', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        get_record_by_hash('nonexistent')
      ).rejects.toThrow('Kayros API error: 404 Not Found');
    });

    it('should allow overriding lookup options', async () => {
      const mockResponse = {
        data_item: 'abc123',
        data_type: 'provable_custom',
        hash_item: 'def456',
        hash_type: 'sha3_256',
        position: 1,
        ts: '2024-01-01T00:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await get_record_by_hash('record_hash_123', {
        dataType: null,
        apiKey: 'private-key-456',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${getKayrosUrl(API_ROUTES.GET_RECORD_BY_HASH)}?hash=${encodeURIComponent('record_hash_123')}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-User-Key': 'private-key-456',
          }),
        })
      );
    });
  });
});
