import { useEffect, useState } from 'react';
import {
  get_record_by_hash,
  getRecordUrl,
  KayrosEnvelope,
  type GetRecordResponse
} from 'provable-sdk-js';

export interface VerificationState {
  loading: boolean;
  error?: string;
  remoteError?: string;
  computedHash?: string;
  dataHash?: string;
  hashMatch?: boolean;
  remoteMatch?: boolean;
  remoteRecord?: GetRecordResponse;
  remoteDataItemHex?: string;
  recordUrl?: string;
  timestamp?: string;
}

function decodeBase64ToHex(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const decoded = atob(value);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i += 1) {
      bytes[i] = decoded.charCodeAt(i);
    }
    if (bytes.length !== 32) return undefined;
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return undefined;
  }
}

async function fetchRecordWithRetry(hash: string, dataType?: string): Promise<GetRecordResponse> {
  try {
    return await get_record_by_hash(hash, dataType);
  } catch (firstError) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return get_record_by_hash(hash, dataType);
  }
}

export function useKayrosVerification(envelope?: KayrosEnvelope): VerificationState {
  const [state, setState] = useState<VerificationState>({ loading: false });

  useEffect(() => {
    if (!envelope) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      setState({ loading: true });

      try {
        const normalized = envelope;
        const dataHash = normalized.getDataHash();

        if (!dataHash) {
          setState({
            loading: false,
            error: 'Missing data hash in envelope'
          });
          return;
        }

        const computedHash = await normalized.computeDataHash();
        const hashMatch = computedHash === dataHash;
        const kayrosHash = normalized.getKayrosHash();
        const dataType = normalized.getDataTypeLabel() || undefined;

        let recordUrl: string | undefined;
        let remoteRecord: GetRecordResponse | undefined;
        let remoteMatch: boolean | undefined;
        let remoteError: string | undefined;
        let timestamp: string | undefined;
        let remoteDataItemHex: string | undefined;

        if (kayrosHash) {
          recordUrl = getRecordUrl(kayrosHash, dataType ?? undefined);
          try {
            remoteRecord = await fetchRecordWithRetry(kayrosHash, dataType);

            remoteDataItemHex = decodeBase64ToHex(remoteRecord?.data_item);
            if (remoteDataItemHex) {
              remoteMatch = computedHash === remoteDataItemHex;
            }

            if (remoteRecord?.ts) {
              timestamp = remoteRecord.ts;
            }
          } catch (err) {
            remoteError = `Failed to fetch remote record: ${err instanceof Error ? err.message : String(err)}`;
          }
        }

        if (!cancelled) {
          setState({
            loading: false,
            computedHash,
            dataHash,
            hashMatch,
            remoteMatch,
            remoteRecord,
            remoteDataItemHex,
            remoteError,
            recordUrl,
            timestamp
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error: `Verification error: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [envelope]);

  return state;
}
