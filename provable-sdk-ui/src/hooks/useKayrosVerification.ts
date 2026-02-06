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
  recordUrl?: string;
  timestamp?: string;
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
        const dataType = normalized.getDataType() || undefined;

        let recordUrl: string | undefined;
        let remoteRecord: GetRecordResponse | undefined;
        let remoteMatch: boolean | undefined;
        let remoteError: string | undefined;
        let timestamp: string | undefined;

        if (kayrosHash) {
          recordUrl = getRecordUrl(kayrosHash, dataType ?? undefined);
          try {
            remoteRecord = await fetchRecordWithRetry(kayrosHash, dataType);

            const remoteDataItemHex = remoteRecord?.data?.data_item_hex ?? (remoteRecord as any)?.data_item_hex;
            if (remoteDataItemHex) {
              remoteMatch = computedHash === remoteDataItemHex;
            }

            if (remoteRecord?.data?.timestamp) {
              timestamp = remoteRecord.data.timestamp;
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
