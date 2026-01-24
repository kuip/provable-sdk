/**
 * Verification utilities
 */

import { get_record_by_hash } from './api';
import type { VerifyResult } from './types';
import { KayrosEnvelope } from './types';

/**
 * Verify data against a Kayros proof
 * @param envelope - Object containing data and kayros metadata
 * @returns Verification result with validity status and details
 */
export async function verify<T = unknown>(envelope: KayrosEnvelope<T>): Promise<VerifyResult> {
  try {
    const dataHash = envelope.getDataHash();

    if (!dataHash) {
      return {
        valid: false,
        error: 'Missing hash in envelope',
      };
    }

    const computedHash = await envelope.computeDataHash();

    // Check if hashes match
    const hashMatch = computedHash === dataHash;

    if (!hashMatch) {
      return {
        valid: false,
        error: 'Hash mismatch: computed hash does not match data hash',
        details: {
          hashMatch: false,
          computedHash,
          dataHash,
        },
      };
    }

    // If there's a Kayros hash, verify against remote record
    const kayrosHash = envelope.getKayrosHash();
    if (kayrosHash) {

      try {
        // Fetch remote record with retry logic
        let remoteRecord;
        try {
          remoteRecord = await get_record_by_hash(kayrosHash);
        } catch (firstError) {
          // Retry once after 2 seconds
          await new Promise(resolve => setTimeout(resolve, 2000));
          remoteRecord = await get_record_by_hash(kayrosHash);
        }

        if (!remoteRecord.data || !remoteRecord.data.data_item_hex) {
          return {
            valid: false,
            error: 'Invalid remote record structure',
            details: {
              hashMatch: true,
              computedHash,
              dataHash,
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
              dataHash,
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
            dataHash,
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
            dataHash,
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
        dataHash,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: `Verification error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
