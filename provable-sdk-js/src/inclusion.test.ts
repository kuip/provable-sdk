/**
 * Table-driven integration test for merkle inclusion proof verification.
 *
 * Each entry: { hash, valid, pending, error? }
 *
 * Configure API target via env:
 *   KAYROS_HOST  - defaults to https://kayros.provable.dev
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { verifyWithInclusion } from './verify';
import { setKayrosHost, getKayrosHost } from './config';

const DATA_TYPE = 'benchmark_s32';

const cases: {
  hash: string;
  valid: boolean;
  pending: boolean;
  error?: string;
}[] = [
  {
    hash: '2916cd7af433854691a33ed8014abdd1379901fe94e5b74367ac59ded1699db2',
    valid: true,
    pending: false,
  },
  {
    hash: '2ee055213dc902d9b2ebab428c780167c500c2c33ef33fa4ca5baab379a23565',
    valid: true,
    pending: false,
  },
  {
    hash: 'e2d9d0b00f9f5f2a1ceeb603b0ce13343e8a9650a16dcd6a74d7fb212700ba1e',
    valid: true,
    pending: true,
  },
];

describe('verifyWithInclusion', () => {
  beforeAll(() => {
    const host = process.env.KAYROS_HOST;
    if (host) {
      setKayrosHost(host);
    }
    console.log(`Kayros host: ${getKayrosHost()}`);
    console.log(`data_type:   ${DATA_TYPE}`);
  });

  it.each(cases)(
    'hash=$hash valid=$valid pending=$pending',
    async ({ hash, valid, pending, error }) => {
      const result = await verifyWithInclusion({
        data_type: DATA_TYPE,
        kayros_hash: hash,
        verify_batch_existence: true,
      });

      expect(result.valid).toBe(valid);
      expect(result.details?.pending).toBe(pending);

      if (error) {
        expect(result.error).toContain(error);
      } else {
        expect(result.error).toBeUndefined();
      }

      if (valid) {
        expect(result.details?.recordFound).toBe(true);
        expect(result.details?.recordHashMatch).toBe(true);
        expect(result.details?.proofFetched).toBe(true);
        expect(result.details?.proofDataTypeMatch).toBe(true);
        expect(result.details?.proofHashItemMatch).toBe(true);
        expect(result.details?.targetPositionMatch).toBe(true);

        if (!pending) {
          expect(result.details?.proofPathMatch).toBe(true);
          expect(result.details?.batchExistenceMatch).toBe(true);
        }
      }
    },
    60000,
  );
});
