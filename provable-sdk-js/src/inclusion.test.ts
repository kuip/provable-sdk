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
const LEVELS_HASH_TYPE = process.env.KAYROS_LEVELS_HASH_TYPE;

const cases: {
  hash: string;
  valid: boolean;
  pending: boolean;
  error?: string;
}[] = [
  {
    hash: '2ad24749d627b2bf8339821f2795408f9bd011383a744b95d1d2619b42ef868f',
    valid: true,
    pending: false,
  },
  {
    hash: '154d496693d7bf53d48c99d01ca602b8bdc03d84ad65448c6a9802c3f4638069',
    valid: true,
    pending: false,
  },
  {
    hash: 'cb2bcf5236387bc6020bcbe4e392da5e8501124e1031f210a5c11218e83012b4',
    valid: true,
    pending: false,
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
        levels_hash_type: LEVELS_HASH_TYPE,
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
    30000,
  );
});
