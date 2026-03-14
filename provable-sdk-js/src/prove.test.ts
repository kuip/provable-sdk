/**
 * Tests for prove module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prove_data, prove_data_str } from './prove';
import * as api from './api';

vi.mock('./api');

describe('prove', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('prove_data', () => {
    it('should hash data and call prove_single_hash', async () => {
      const mockResponse = { data: { computed_hash_hex: 'abc123' } };
      vi.spyOn(api, 'prove_single_hash').mockResolvedValue(mockResponse as any);

      const data = new TextEncoder().encode('test data');
      const result = await prove_data(data);

      expect(api.prove_single_hash).toHaveBeenCalledWith(
        expect.stringMatching(/^[0-9a-f]{64}$/),
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('should pass custom data_type to prove_single_hash', async () => {
      const mockResponse = { data: { computed_hash_hex: 'def456' } };
      const customDataType = '70726f7661626c655f666f726d73000000000000000000000000000000000000';
      vi.spyOn(api, 'prove_single_hash').mockResolvedValue(mockResponse as any);

      const data = new TextEncoder().encode('test data');
      await prove_data(data, customDataType);

      expect(api.prove_single_hash).toHaveBeenCalledWith(
        expect.any(String),
        customDataType
      );
    });

    it('should pass request options through to prove_single_hash', async () => {
      const mockResponse = { data: { computed_hash_hex: 'ghi789' } };
      const options = { dataType: 'provable_custom', apiKey: 'private-key-123' };
      vi.spyOn(api, 'prove_single_hash').mockResolvedValue(mockResponse as any);

      const data = new TextEncoder().encode('test data');
      await prove_data(data, options);

      expect(api.prove_single_hash).toHaveBeenCalledWith(
        expect.any(String),
        options
      );
    });

    it('should produce consistent hashes for same data', async () => {
      vi.spyOn(api, 'prove_single_hash').mockResolvedValue({} as any);

      const data = new TextEncoder().encode('test');
      await prove_data(data);
      const hash1 = (api.prove_single_hash as any).mock.calls[0][0];

      await prove_data(data);
      const hash2 = (api.prove_single_hash as any).mock.calls[1][0];

      expect(hash1).toBe(hash2);
    });
  });

  describe('prove_data_str', () => {
    it('should hash string and call prove_single_hash', async () => {
      const mockResponse = { data: { computed_hash_hex: 'abc123' } };
      vi.spyOn(api, 'prove_single_hash').mockResolvedValue(mockResponse as any);

      const result = await prove_data_str('test string');

      expect(api.prove_single_hash).toHaveBeenCalledWith(
        expect.stringMatching(/^[0-9a-f]{64}$/),
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('should pass custom data_type to prove_single_hash', async () => {
      const mockResponse = { data: { computed_hash_hex: 'def456' } };
      const customDataType = '70726f7661626c655f666f726d73000000000000000000000000000000000000';
      vi.spyOn(api, 'prove_single_hash').mockResolvedValue(mockResponse as any);

      await prove_data_str('test string', customDataType);

      expect(api.prove_single_hash).toHaveBeenCalledWith(
        expect.any(String),
        customDataType
      );
    });

    it('should pass request options through to prove_single_hash', async () => {
      const mockResponse = { data: { computed_hash_hex: 'ghi789' } };
      const options = { dataType: 'provable_custom', apiKey: 'private-key-456' };
      vi.spyOn(api, 'prove_single_hash').mockResolvedValue(mockResponse as any);

      await prove_data_str('test string', options);

      expect(api.prove_single_hash).toHaveBeenCalledWith(
        expect.any(String),
        options
      );
    });

    it('should handle empty string', async () => {
      vi.spyOn(api, 'prove_single_hash').mockResolvedValue({} as any);

      await prove_data_str('');

      expect(api.prove_single_hash).toHaveBeenCalledWith(
        expect.stringMatching(/^[0-9a-f]{64}$/),
        undefined
      );
    });
  });
});
