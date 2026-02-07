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

function normalizeUuid(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  const compact = normalized.replace(/-/g, '');
  if (/^[0-9a-f]{32}$/.test(compact)) {
    return compact;
  }
  return undefined;
}

function resolveTimestampResponse<T>(envelope: KayrosEnvelope<T>): any {
  return (envelope as any)?.kayros?.timestamp?.response;
}

function resolveRegisterResponse<T>(envelope: KayrosEnvelope<T>): any {
  const response = resolveTimestampResponse(envelope);
  return response?.response ?? response;
}

function resolveDataTypeForLookup<T>(envelope: KayrosEnvelope<T>): string | undefined {
  const timestampResponse = resolveTimestampResponse(envelope);
  const registerResponse = resolveRegisterResponse(envelope);

  // Keep raw value first (including any null-byte padding) for exact Kayros lookup.
  const rawDataType = timestampResponse?.data?.data_type
    || registerResponse?.data?.data_type
    || registerResponse?.data_type;

  if (typeof rawDataType === 'string' && rawDataType.length > 0) {
    return rawDataType;
  }

  return envelope.getDataTypeLabel() || undefined;
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
    const proofTimeuuidRaw = envelope.getTimeUUID();
    const proofTimeuuid = normalizeUuid(proofTimeuuidRaw);

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
    const dataType = resolveDataTypeForLookup(envelope);
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
              proofTimeuuid,
              remoteRecord,
            },
          };
        }

        const remoteHashMatch = computedHash === remoteDataItemHex;
        const remoteTimeuuidRaw = remoteRecord.ts;
        const remoteTimeuuid = normalizeUuid(remoteTimeuuidRaw);
        const timestampMatch = proofTimeuuid ? proofTimeuuid === remoteTimeuuid : undefined;
        const remoteMatch = remoteHashMatch && (timestampMatch ?? true);

        if (!remoteHashMatch) {
          return {
            valid: false,
            error: 'Remote verification failed: hash does not match remote record',
            details: {
              hashMatch: true,
              remoteMatch: false,
              computedHash,
              dataHash,
              remoteHash: remoteDataItemHex,
              proofTimeuuid: proofTimeuuidRaw,
              remoteTimeuuid: remoteTimeuuidRaw,
              timestampMatch,
              remoteRecord,
            },
          };
        }

        if (proofTimeuuid && !timestampMatch) {
          return {
            valid: false,
            error: `Remote verification failed: timestamp mismatch between proof and remote record (proof: ${proofTimeuuidRaw}, remote: ${remoteTimeuuidRaw})`,
            details: {
              hashMatch: true,
              remoteMatch: false,
              computedHash,
              dataHash,
              remoteHash: remoteDataItemHex,
              proofTimeuuid: proofTimeuuidRaw,
              remoteTimeuuid: remoteTimeuuidRaw,
              timestampMatch: false,
              remoteRecord,
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
            proofTimeuuid: proofTimeuuidRaw,
            remoteTimeuuid: remoteTimeuuidRaw,
            timestampMatch,
            remoteRecord,
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
            proofTimeuuid: proofTimeuuidRaw,
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
        proofTimeuuid: proofTimeuuidRaw,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: `Verification error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
