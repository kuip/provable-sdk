/**
 * Verification utilities
 */

import { keccak256_str } from './hash';
import { get_record_by_hash } from './api';
import type { KayrosEnvelope, VerifyResult } from './types';

/**
 * Verify data against a Kayros proof
 * @param envelope - Object containing data and kayros metadata
 * @returns Verification result with validity status and details
 */
export async function verify<T = unknown>(envelope: KayrosEnvelope<T>): Promise<VerifyResult> {
  try {
    // Validate envelope structure
    if (!envelope.kayros) {
      return {
        valid: false,
        error: 'Missing field: envelope.kayros',
      };
    }

    if (!envelope.kayros.hash) {
      return {
        valid: false,
        error: 'Missing field: envelope.kayros.hash',
      };
    }

    // Compute hash of the data (stringify as JSON for object data)
    const dataString = typeof envelope.data === 'string'
      ? envelope.data
      : JSON.stringify(envelope.data);
    const computedHash = keccak256_str(dataString);
    const envelopeHash = envelope.kayros.hash;

    // Check if hashes match
    const hashMatch = computedHash === envelopeHash;

    if (!hashMatch) {
      return {
        valid: false,
        error: 'Hash mismatch: computed hash does not match envelope hash',
        details: {
          hashMatch: false,
          computedHash,
          envelopeHash,
        },
      };
    }

    // If there's a timestamp, verify against remote record
    if (envelope.kayros.timestamp && envelope.kayros.timestamp.response) {
      const timestampResponse = envelope.kayros.timestamp.response as any;

      if (!timestampResponse.data || !timestampResponse.data.computed_hash_hex) {
        return {
          valid: false,
          error: 'Invalid timestamp response structure',
          details: {
            hashMatch: true,
            computedHash,
            envelopeHash,
          },
        };
      }

      const remoteHash = timestampResponse.data.computed_hash_hex;

      try {
        // Fetch remote record with retry logic
        let remoteRecord;
        try {
          remoteRecord = await get_record_by_hash(remoteHash);
        } catch (firstError) {
          // Retry once after 2 seconds
          await new Promise(resolve => setTimeout(resolve, 2000));
          remoteRecord = await get_record_by_hash(remoteHash);
        }

        if (!remoteRecord.data || !remoteRecord.data.data_item_hex) {
          return {
            valid: false,
            error: 'Invalid remote record structure',
            details: {
              hashMatch: true,
              computedHash,
              envelopeHash,
            },
          };
        }

        const remoteDataItemHex = remoteRecord.data.data_item_hex;
        const remoteMatch = computedHash === remoteDataItemHex;

        if (!remoteMatch) {
          return {
            valid: false,
            error: 'Remote verification failed: hash does not match remote record',
            details: {
              hashMatch: true,
              remoteMatch: false,
              computedHash,
              envelopeHash,
              remoteHash: remoteDataItemHex,
            },
          };
        }

        return {
          valid: true,
          details: {
            hashMatch: true,
            remoteMatch: true,
            computedHash,
            envelopeHash,
            remoteHash: remoteDataItemHex,
          },
        };
      } catch (error) {
        return {
          valid: false,
          error: `Failed to fetch remote record: ${error instanceof Error ? error.message : String(error)}`,
          details: {
            hashMatch: true,
            computedHash,
            envelopeHash,
          },
        };
      }
    }

    // No timestamp, just verify local hash match
    return {
      valid: true,
      details: {
        hashMatch: true,
        computedHash,
        envelopeHash,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: `Verification error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
