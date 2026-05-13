import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { sha3_256 as sha3_256Impl } from 'js-sha3';

import { verify, verifyMerkleProof, verifyWithInclusion } from './verify';
import { DEFAULT_USER_KEY, setUserKey } from './config';

global.fetch = vi.fn();

function toBase64(hex: string): string {
  return Buffer.from(hex, 'hex').toString('base64');
}

function makeLevel0(count: number): string[] {
  return Array.from({ length: count }, (_, index) => index.toString(16).padStart(2, '0').repeat(32));
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

describe('verifyWithInclusion', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setUserKey(DEFAULT_USER_KEY);
  });

  it('uses sha3-256 for Merkle rollups by default', async () => {
    const dataItem = '11'.repeat(32);
    const kayrosHash = '22'.repeat(32);
    const siblingHash = '33'.repeat(32);
    const rootHash = sha3_256Impl(Buffer.from(kayrosHash + siblingHash, 'hex'));

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data_item: toBase64(dataItem),
          data_type: 'proof_type',
          hash_item: toBase64(kayrosHash),
          hash_type: 'sha256',
          position: 0,
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
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data_type: 'proof_type',
          hash_item: kayrosHash,
          proof: [kayrosHash, siblingHash, rootHash],
          root: rootHash,
          position: 0,
          levels: 2,
          level_counts: [2, 1],
          level_starts: [0, 0],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          exists: true,
          level: 1,
          position: 0,
          data_type: 'proof_type',
          found_hash: rootHash,
          message: 'ok',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          exists: true,
          level: 0,
          position: 0,
          data_type: 'proof_type',
          found_hash: kayrosHash,
          message: 'ok',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data_type: 'proof_type',
          level: 0,
          start: 0,
          count: 2,
          results: [1, 1],
          matches: 2,
          mismatches: 0,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data_type: 'proof_type',
          level: 1,
          start: 0,
          count: 1,
          results: [1],
          matches: 1,
          mismatches: 0,
        }),
      });

    const result = await verifyWithInclusion({
      data_type: 'proof_type',
      kayros_hash: kayrosHash,
      trusted_root_hash: rootHash,
      trusted_level: 1,
      trusted_position: 0,
      verify_batch_existence: true,
      level_checks: [{ level: 0, position: 0 }],
      apiKey: 'private-key-456',
    });

    expect(result.valid).toBe(true);
    expect(result.details?.levelsHashType).toBe('sha3-256');
    expect(result.details?.proofPathMatch).toBe(true);
    expect(result.details?.batchExistenceMatch).toBe(true);
    expect(result.details?.trustedLevelMatch).toBe(true);
    expect(result.details?.levelChecks?.[0]?.valid).toBe(true);
  });

  it('supports overriding the Merkle levels hash algorithm', async () => {
    const dataItem = '11'.repeat(32);
    const kayrosHash = '22'.repeat(32);
    const siblingHash = '33'.repeat(32);
    const rootHash = createHash('sha256').update(Buffer.from(kayrosHash + siblingHash, 'hex')).digest('hex');

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data_item: toBase64(dataItem),
          data_type: 'proof_type',
          hash_item: toBase64(kayrosHash),
          hash_type: 'sha256',
          position: 0,
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
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data_type: 'proof_type',
          hash_item: kayrosHash,
          proof: [kayrosHash, siblingHash, rootHash],
          root: rootHash,
          position: 0,
          levels: 2,
          level_counts: [2, 1],
          level_starts: [0, 0],
        }),
      });

    const result = await verifyWithInclusion({
      data_type: 'proof_type',
      kayros_hash: kayrosHash,
      levels_hash_type: 'sha256',
    });

    expect(result.valid).toBe(true);
    expect(result.details?.levelsHashType).toBe('sha256');
    expect(result.details?.proofPathMatch).toBe(true);
  });
});

describe('verifyMerkleProof', () => {
  it('marks the proof as pending when the L0 group has no L1 rollup yet', async () => {
    const level0 = makeLevel0(255);

    const result = await verifyMerkleProof({
      proof: {
        success: true,
        data_type: 'proof_type',
        hash_item: level0[5],
        proof: level0,
        root: '',
        position: 5,
        levels: 1,
        level_counts: [255],
        level_starts: [0],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.pending).toBe(true);
    expect(result.status).toBe('pending');
    expect(result.message).toContain('no L1 rollup yet');
    expect(result.positionPath).toEqual([5]);
    expect(result.details).toContain('L0[0..254] partial group');
  });

  it('verifies a finalized local proof using sha3-256 by default', async () => {
    const level0 = makeLevel0(256);
    const level1 = sha3_256Impl(Buffer.from(level0.join(''), 'hex'));

    const result = await verifyMerkleProof({
      proof: {
        success: true,
        data_type: 'proof_type',
        hash_item: level0[7],
        proof: [...level0, level1],
        root: level1,
        position: 7,
        levels: 2,
        level_counts: [256, 1],
        level_starts: [0, 0],
      },
    });

    expect(result.valid).toBe(true);
    expect(result.pending).toBe(false);
    expect(result.status).toBe('valid');
    expect(result.levelsHashType).toBe('sha3-256');
    expect(result.computedRoot).toBe(level1);
    expect(result.details[0]).toContain('SHA3-256');
    expect(result.details[result.details.length - 1]).toContain('Root: ✓');
  });

  it('treats a proof with a verified L1 hash but no root as valid for existing levels', async () => {
    const level0 = makeLevel0(256);
    const level1 = sha3_256Impl(Buffer.from(level0.join(''), 'hex'));

    const result = await verifyMerkleProof({
      proof: {
        success: true,
        data_type: 'proof_type',
        hash_item: level0[9],
        proof: [...level0, level1],
        root: '',
        position: 9,
        levels: 2,
        level_counts: [256, 1],
        level_starts: [0, 0],
      },
    });

    expect(result.valid).toBe(true);
    expect(result.pending).toBe(false);
    expect(result.status).toBe('valid');
    expect(result.message).toContain('Root pending');
    expect(result.details[result.details.length - 1]).toContain('Root pending');
  });

  it('reports a rollup mismatch with details', async () => {
    const level0 = makeLevel0(256);
    const level1 = 'ff'.repeat(32);

    const result = await verifyMerkleProof({
      proof: {
        success: true,
        data_type: 'proof_type',
        hash_item: level0[3],
        proof: [...level0, level1],
        root: level1,
        position: 3,
        levels: 2,
        level_counts: [256, 1],
        level_starts: [0, 0],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.pending).toBe(false);
    expect(result.status).toBe('invalid');
    expect(result.message).toContain('Level 0 rollup mismatch');
    expect(result.error).toContain('Computed');
    expect(result.details[0]).toContain('✗');
  });
});
