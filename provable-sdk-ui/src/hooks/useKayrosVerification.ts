import { useEffect, useState } from 'react';
import {
  verify,
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
  timestampLocal?: string;
  timestampMatch?: boolean;
  proofTimeuuid?: string;
  remoteTimeuuid?: string;
}

const UUID_EPOCH_OFFSET_100NS = BigInt('0x01b21dd213814000');
const NS_PER_SECOND = 1_000_000_000n;

function decodeKayrosUuidToIsoNs(uuidValue?: string): string | undefined {
  if (!uuidValue) {
    return undefined;
  }

  const compact = uuidValue.trim().toLowerCase().replace(/-/g, '');
  if (!/^[0-9a-f]{32}$/.test(compact)) {
    return undefined;
  }

  const uuid = `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
  const parts = uuid.split('-');
  if (parts.length !== 5) {
    return undefined;
  }

  const [timeLow, timeMid, timeHiVersion, , node] = parts;
  if (timeLow.length !== 8 || timeMid.length !== 4 || timeHiVersion.length !== 4 || node.length !== 12) {
    return undefined;
  }

  const timeHi = timeHiVersion.slice(1); // Drop UUID version nibble
  let uuidTimestamp: bigint;
  try {
    uuidTimestamp = BigInt(`0x${timeHi}${timeMid}${timeLow}`);
  } catch {
    return undefined;
  }

  const unix100ns = uuidTimestamp - UUID_EPOCH_OFFSET_100NS;
  if (unix100ns < 0) {
    return undefined;
  }

  const byte1 = Number.parseInt(node.slice(2, 4), 16);
  if (Number.isNaN(byte1)) {
    return undefined;
  }

  const remainderNs = (byte1 >> 1) & 0x7f;
  const timestampNs = unix100ns * 100n + BigInt(remainderNs);
  const seconds = timestampNs / NS_PER_SECOND;
  const subsecNs = timestampNs % NS_PER_SECOND;

  const dateMs = Number(seconds * 1000n);
  if (!Number.isFinite(dateMs)) {
    return undefined;
  }

  const date = new Date(dateMs);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const isoBase = date.toISOString().replace(/\.\d{3}Z$/, '');
  const subsec = subsecNs.toString().padStart(9, '0');
  return `${isoBase}.${subsec}Z`;
}

function formatIsoNsToLocal(isoNs?: string): string | undefined {
  if (!isoNs) {
    return undefined;
  }

  const match = isoNs.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.(\d{9})Z$/);
  if (!match) {
    return undefined;
  }

  const [, base, nanos] = match;
  const msIso = `${base}.${nanos.slice(0, 3)}Z`;
  const date = new Date(msIso);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return `${date.toLocaleString()}.${nanos}`;
}

function resolveTimestampResponse(envelope: KayrosEnvelope): any {
  return (envelope as any)?.kayros?.timestamp?.response;
}

function resolveKayrosHash(envelope: KayrosEnvelope): string | undefined {
  const fromEnvelope = envelope.getKayrosHash();
  if (fromEnvelope) {
    return fromEnvelope;
  }

  const response = resolveTimestampResponse(envelope);
  const registerResponse = response?.response ?? response;
  return registerResponse?.hash
    || registerResponse?.data?.computed_hash_hex
    || registerResponse?.computed_hash_hex
    || registerResponse?.data?.hash
    || registerResponse?.data?.computed_hash
    || registerResponse?.computed_hash
    || undefined;
}

function resolveDataType(envelope: KayrosEnvelope): string | undefined {
  const fromEnvelope = envelope.getDataType();
  if (fromEnvelope) {
    return fromEnvelope;
  }

  const response = resolveTimestampResponse(envelope);
  const registerResponse = response?.response ?? response;
  const timestampResponse = resolveTimestampResponse(envelope);

  return registerResponse?.data_type
    || registerResponse?.data?.data_type
    || timestampResponse?.data?.data_type
    || envelope.getDataTypeLabel()
    || undefined;
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
        const kayrosHash = resolveKayrosHash(normalized);
        const dataType = resolveDataType(normalized);
        const verification = await verify(normalized);

        let recordUrl: string | undefined;
        let remoteRecord: GetRecordResponse | undefined = verification.details?.remoteRecord;
        let remoteMatch: boolean | undefined = verification.details?.remoteMatch;
        let remoteError: string | undefined;
        let timestampMatch: boolean | undefined = verification.details?.timestampMatch;
        let remoteDataItemHex: string | undefined = verification.details?.remoteHash;
        let proofTimeuuid: string | undefined = verification.details?.proofTimeuuid;
        let remoteTimeuuid: string | undefined = verification.details?.remoteTimeuuid;

        if (kayrosHash) {
          recordUrl = getRecordUrl(kayrosHash, dataType ?? undefined);
        }

        // Display timestamp strictly from proof contents, never from remote record.
        const timestampUuid = normalized.getTimeUUID();
        const timestampIsoNs = decodeKayrosUuidToIsoNs(timestampUuid);
        const timestamp = timestampUuid;
        const timestampLocal = formatIsoNsToLocal(timestampIsoNs);

        if (!verification.valid) {
          if (verification.details?.hashMatch === false) {
            // Local integrity failure (data hash mismatch)
            setState({
              loading: false,
              error: verification.error ?? 'Verification failed',
              computedHash: verification.details?.computedHash,
              dataHash: verification.details?.dataHash,
              hashMatch: verification.details?.hashMatch,
              remoteMatch,
              remoteRecord,
              remoteDataItemHex,
              remoteError,
              recordUrl,
              timestamp,
              timestampLocal,
              timestampMatch,
              proofTimeuuid,
              remoteTimeuuid,
            });
            return;
          }

          remoteError = verification.error ?? remoteError;
        }

        if (!cancelled) {
          setState({
            loading: false,
            computedHash: verification.details?.computedHash,
            dataHash,
            hashMatch: verification.details?.hashMatch,
            remoteMatch,
            remoteRecord,
            remoteDataItemHex,
            remoteError,
            recordUrl,
            timestamp,
            timestampLocal,
            timestampMatch,
            proofTimeuuid,
            remoteTimeuuid,
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
