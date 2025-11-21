/**
 * Provable SDK Types
 */

export interface KayrosMetadata {
  hash?: string;
  hashAlgorithm?: 'keccak256';
  timestamp?: {
    service: string;
    response: unknown;
  };
}

export interface KayrosEnvelope<T = unknown> {
  data: T;
  kayros: KayrosMetadata;
}

export interface ProveSingleHashResponse {
  data: {
    computed_hash_hex: string;
    [key: string]: unknown;
  };
}

export interface GetRecordResponse {
  data: {
    data_item_hex: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}

export interface VerifyResult {
  valid: boolean;
  error?: string;
  details?: {
    hashMatch?: boolean;
    remoteMatch?: boolean;
    computedHash?: string;
    envelopeHash?: string;
    remoteHash?: string;
  };
}
