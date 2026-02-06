/**
 * Verification utilities
 */

import { get_record_by_hash } from './api';
import type { VerifyResult } from './types';
import { KayrosEnvelope } from './types';

function normalizeRemoteDataItemHex(value: string): string | undefined {
  if (!value) return undefined;

  // Kayros GetRecordByHash returns blob fields base64-encoded.
  try {
    const decoded = atob(value);
    if (/^[0-9a-fA-F]{64}$/.test(decoded)) {
      return decoded.toLowerCase();
    }

    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    if (bytes.length === 32) {
      return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // fallthrough to hex
  }

  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    return value.toLowerCase();
  }

  return undefined;
}

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
    const dataType = envelope.getDataTypeLabel() || undefined;
    if (kayrosHash) {

      try {
        // Fetch remote record with retry logic
        let remoteRecord;
        let lastError: unknown;
        const delays = [1000, 2000, 2000];
        for (let attempt = 0; attempt < delays.length; attempt += 1) {
          try {
            remoteRecord = await get_record_by_hash(kayrosHash, dataType);
            lastError = undefined;
            break;
          } catch (err) {
            lastError = err;
            await new Promise(resolve => setTimeout(resolve, delays[attempt]));
          }
        }
        if (!remoteRecord) {
          throw lastError ?? new Error('Failed to fetch remote record');
        }

        const rawRemoteDataItem = remoteRecord.data_item;
        const remoteDataItemHex = rawRemoteDataItem ? normalizeRemoteDataItemHex(rawRemoteDataItem) : undefined;
        if (!remoteDataItemHex) {
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
