import { beforeEach, describe, expect, it, vi } from 'vitest';

import { verify, verifyWithInclusion } from './verify';
import { DEFAULT_USER_KEY, setUserKey } from './config';

global.fetch = vi.fn();

function toBase64(hex: string): string {
  return Buffer.from(hex, 'hex').toString('base64');
}

describe('verify', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setUserKey(DEFAULT_USER_KEY);
  });

  it('verifies a record by kayros_hash with an explicit api key and data type', async () => {
    const dataItem = '11'.repeat(32);
    const kayrosHash = '22'.repeat(32);

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data_item: toBase64(dataItem),
          data_type: 'proof_type',
          hash_item: toBase64(kayrosHash),
          hash_type: 'sha256',
          position: 3,
          prev_hash: toBase64('00'.repeat(32)),
          ts: '123e4567-e89b-12d3-a456-426614174000',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hash: kayrosHash,
          hash_type: 'sha256',
          input_size: 92,
        }),
      });

    const result = await verify({
      data_type: 'proof_type',
      kayros_hash: kayrosHash,
      data_item: dataItem,
      apiKey: 'private-key-123',
    });

    expect(result.valid).toBe(true);
    expect(result.details?.recordFound).toBe(true);
    expect(result.details?.recordHashMatch).toBe(true);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://kayros.provable.dev/api/lightnet/database/record-by-hash?hash=IiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiI%3D&data_type=proof_type',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-User-Key': 'private-key-123',
        }),
      }),
    );
  });

  it('fails when data_item lookup is ambiguous', async () => {
    const dataItem = '33'.repeat(32);

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        count: 2,
        records: [
          {
            data_item: toBase64(dataItem),
            data_type: 'proof_type',
            hash_item: toBase64('44'.repeat(32)),
            hash_type: 'sha256',
            position: 1,
            prev_hash: toBase64('00'.repeat(32)),
            ts: '123e4567-e89b-12d3-a456-426614174000',
          },
          {
            data_item: toBase64(dataItem),
            data_type: 'proof_type',
            hash_item: toBase64('55'.repeat(32)),
            hash_type: 'sha256',
            position: 2,
            prev_hash: toBase64('44'.repeat(32)),
            ts: '123e4567-e89b-12d3-a456-426614174001',
          },
        ],
      }),
    });

    const result = await verify({
      data_type: 'proof_type',
      data_item: dataItem,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Multiple records found');
  });

});
