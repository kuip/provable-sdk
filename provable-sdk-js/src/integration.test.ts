/**
 * Integration test for full SDK cycle
 * Tests: data -> hash -> index with Kayros -> build proof -> verify
 */

import { describe, it, expect } from 'vitest';
import { keccak256_str } from './hash';
import { prove_single_hash, get_record_by_hash } from './api';
import { verify } from './verify';
import type { KayrosEnvelope } from './types';

describe('Full cycle integration', () => {
  it('should complete full cycle: data -> hash -> index -> verify', async () => {
    // Step 1: Start with test data
    const testData = `Integration test data ${Date.now()}`;

    // Step 2: Hash the data
    const dataHash = keccak256_str(testData);
    expect(dataHash).toHaveLength(64);
    expect(dataHash).toMatch(/^[0-9a-f]{64}$/);

    // Step 3: Index with Kayros (prove the hash)
    const kayrosResponse = await prove_single_hash(dataHash);
    expect(kayrosResponse).toBeDefined();
    expect(kayrosResponse.data).toBeDefined();
    expect(kayrosResponse.data.computed_hash_hex).toBeDefined();
    expect(kayrosResponse.data.computed_hash_hex).toHaveLength(64);

    const computedHash = kayrosResponse.data.computed_hash_hex;

    // Step 4: Build proof object (envelope)
    const envelope: KayrosEnvelope<string> = {
      data: testData,
      kayros: {
        hash: dataHash,
        hashAlgorithm: 'keccak256',
        timestamp: {
          service: 'kayros',
          response: kayrosResponse,
        },
      },
    };

    // Step 5: Verify the proof
    const verifyResult = await verify(envelope);

    // Verify result is valid
    expect(verifyResult.valid).toBe(true);
    expect(verifyResult.error).toBeUndefined();

    // Verify hash matches
    expect(verifyResult.details?.hashMatch).toBe(true);
    expect(verifyResult.details?.computedHash).toBe(dataHash);
    expect(verifyResult.details?.envelopeHash).toBe(dataHash);

    // Verify remote record exists and matches
    expect(verifyResult.details?.remoteMatch).toBe(true);
    expect(verifyResult.details?.remoteHash).toBe(dataHash);

    // Step 6: Verify we can retrieve the record by hash using the computed hash from Kayros
    const record = await get_record_by_hash(computedHash);
    expect(record).toBeDefined();
    expect(record.data).toBeDefined();
    expect(record.data.data_item_hex).toBe(dataHash);
  }, 30000); // 30 second timeout for API calls
});
