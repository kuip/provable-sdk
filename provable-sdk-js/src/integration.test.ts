/**
 * Integration test for full SDK cycle
 * Tests: data -> hash -> index with Kayros -> build proof -> verify
 */

import { describe, it, expect } from 'vitest';
import { keccak256_str } from './hash';
import { prove_single_hash, get_record_by_hash } from './api';
import { verify } from './verify';
import { KayrosEnvelope } from './types';
import { getRecordUrl } from './config';

const TEST_DATA_TYPE = "provable_sdk_tests";
const TEST_DATA_TYPE_HEX = Buffer.from(TEST_DATA_TYPE, 'utf8').toString('hex');

describe('Full cycle integration', () => {
  it('should complete full cycle: data -> hash -> index -> verify', async () => {
    // Step 1: Start with test data
    const testData = `Integration test data ${Date.now()}`;

    // Step 2: Hash the data
    const dataHash = keccak256_str(testData);
    expect(dataHash).toHaveLength(64);
    expect(dataHash).toMatch(/^[0-9a-f]{64}$/);

    // Step 3: Index with Kayros (prove the hash)
    const kayrosResponse = await prove_single_hash(dataHash, TEST_DATA_TYPE);
    expect(kayrosResponse).toBeDefined();
    expect(kayrosResponse.hash).toBeDefined();
    expect(kayrosResponse.hash).toHaveLength(64);
    const computedHash = kayrosResponse.hash;
    if (!computedHash) {
      throw new Error('Missing computed hash from Kayros response');
    }

    // Step 4: Build proof object (envelope)
    const timestampResponse = {
      success: true,
      hash: computedHash,
      timeuuid: '',
      data: {
        data_type_hex: TEST_DATA_TYPE_HEX,
      },
    };

    const envelope = new KayrosEnvelope<string>(
      testData,
      {
        hash: dataHash,
        hashAlgorithm: 'keccak256',
        timestamp: {
          service: 'kayros',
          response: timestampResponse,
        },
      }
    );

    // Step 5: Verify the proof
    const verifyResult = await verify(envelope);
    const recordUrl = getRecordUrl(computedHash, TEST_DATA_TYPE);

    // Verify result is valid
    expect(verifyResult.valid).toBe(true);
    expect(verifyResult.error).toBeUndefined();

    // Verify hash matches
    expect(verifyResult.details?.hashMatch).toBe(true);
    expect(verifyResult.details?.computedHash).toBe(dataHash);
    expect(verifyResult.details?.dataHash).toBe(dataHash);

    // Verify remote record exists and matches
    expect(verifyResult.details?.remoteMatch).toBe(true);
    expect(verifyResult.details?.remoteHash).toBe(dataHash);

    // Step 6: Verify we can retrieve the record by hash using the computed hash from Kayros
    const record = await get_record_by_hash(computedHash, TEST_DATA_TYPE);
    expect(record).toBeDefined();
    const dataItemHex = Buffer.from(record.data_item, 'base64').toString('hex');
    expect(dataItemHex).toBe(dataHash);
  }, 30000); // 30 second timeout for API calls
});
