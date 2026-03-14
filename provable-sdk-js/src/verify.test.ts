import { describe, it, expect, beforeEach, vi } from 'vitest';
import { verify } from './verify';
import { KayrosEnvelope } from './envelope';
import { keccak256_str } from './hash';
import { DEFAULT_USER_KEY, setUserKey } from './config';

global.fetch = vi.fn();

describe('verify', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setUserKey(DEFAULT_USER_KEY);
  });

  it('should allow overriding lookup options during verification', async () => {
    const payload = 'hello provable';
    const dataHash = keccak256_str(payload);
    const envelope = new KayrosEnvelope(payload, {
      hash: dataHash,
      hashAlgorithm: 'keccak256',
      timestamp: {
        service: 'kayros',
        response: {
          response: {
            hash: 'kayros_hash_123',
            data_type: 'proof_type',
          },
        },
      },
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data_item: dataHash,
        data_type: 'proof_type',
        hash_item: 'remote_hash',
        hash_type: 'sha3_256',
        position: 1,
        ts: '123e4567e89b12d3a456426614174000',
      }),
    });

    const result = await verify(envelope, {
      dataType: null,
      apiKey: 'private-key-123',
    });

    expect(result.valid).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://kayros.provable.dev/api/lightnet/database/record-by-hash?hash=kayros_hash_123',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-User-Key': 'private-key-123',
        }),
      })
    );
  });
});
