/**
 * Tests for API module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prove_single_hash, get_record_by_hash } from './api';
import { getKayrosUrl, API_ROUTES, DATA_TYPE } from './config';

// Mock fetch globally
global.fetch = vi.fn();

describe('api', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('prove_single_hash', () => {
    it('should call API with default data_type', async () => {
      const mockResponse = {
        data: { computed_hash_hex: 'abc123' },
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
          body: JSON.stringify({
            data_item: 'test_hash',
            data_type: DATA_TYPE,
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should call API with custom data_type', async () => {
      const customDataType = '70726f7661626c655f666f726d73000000000000000000000000000000000000';
      const mockResponse = {
        data: { computed_hash_hex: 'def456' },
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

    it('should throw error for invalid data_type length', async () => {
      await expect(
        prove_single_hash('test_hash', 'short')
      ).rejects.toThrow('data_type must be exactly 64 hex characters');
    });

    it('should throw error for non-hex data_type', async () => {
      const invalidDataType = 'gggg' + '0'.repeat(60);
      await expect(
        prove_single_hash('test_hash', invalidDataType)
      ).rejects.toThrow('data_type must contain only valid hex characters');
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
        data: { data_item_hex: 'abc123', timestamp: '2024-01-01' },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await get_record_by_hash('record_hash_123');

      expect(global.fetch).toHaveBeenCalledWith(
        `${getKayrosUrl(API_ROUTES.GET_RECORD_BY_HASH)}?hash_item=record_hash_123`,
        expect.objectContaining({
          method: 'GET',
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
  });
});
