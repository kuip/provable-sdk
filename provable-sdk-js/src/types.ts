/**
 * Provable SDK Types
 */

export interface KayrosMetadata {
  hash?: string;
  hashAlgorithm?: string;
  timestamp?: {
    service: string;
    response: APIResponse<SingleHashResponse>;
  };
}

export interface KayrosMetadataV0 extends APIResponse<SingleHashResponse> {
  hash?: string;
  hashAlgorithm?: string;
}

export type AnyKayrosMetadata = KayrosMetadata | KayrosMetadataV0;

/**
 * Kayros envelope with data and proof metadata
 */
export class KayrosEnvelope<T = unknown> {
  constructor(
    public readonly data: T,
    public readonly kayros: AnyKayrosMetadata
  ) {}

  /**
   * Get the data hash (data_item_hex) from the metadata
   */
  getDataHash(): string | undefined {
    const m = this.kayros;
    // V1 format: hash is directly on metadata
    if ('hash' in m && m.hash) {
      return m.hash;
    }
    // V0 format: hash is in data.data_item_hex
    if ('data' in m && m.data?.data_item_hex) {
      return m.data.data_item_hex;
    }
    // V1 with timestamp response
    if ('timestamp' in m && m.timestamp?.response?.data?.data_item_hex) {
      return m.timestamp.response.data.data_item_hex;
    }
    return undefined;
  }

  /**
   * Get the data type (data_type_hex) from the metadata
   */
  getDataType(): string | undefined {
    const m = this.kayros;
    // V0 format
    if ('data' in m && m.data?.data_type_hex) {
      return m.data.data_type_hex;
    }
    // V1 with timestamp response
    if ('timestamp' in m && m.timestamp?.response?.data?.data_type_hex) {
      return m.timestamp.response.data.data_type_hex;
    }
    return undefined;
  }

  /**
   * Get the Kayros hash (computed_hash_hex) from the metadata
   */
  getKayrosHash(): string | undefined {
    const m = this.kayros;
    // V0 format
    if ('data' in m && m.data?.computed_hash_hex) {
      return m.data.computed_hash_hex;
    }
    // V1 with timestamp response
    if ('timestamp' in m && m.timestamp?.response?.data?.computed_hash_hex) {
      return m.timestamp.response.data.computed_hash_hex;
    }
    return undefined;
  }

  /**
   * Get the time UUID (timeuuid_hex) from the metadata
   */
  getTimeUUID(): string | undefined {
    const m = this.kayros;
    // V0 format
    if ('data' in m && m.data?.timeuuid_hex) {
      return m.data.timeuuid_hex;
    }
    // V1 with timestamp response
    if ('timestamp' in m && m.timestamp?.response?.data?.timeuuid_hex) {
      return m.timestamp.response.data.timeuuid_hex;
    }
    return undefined;
  }

  /**
   * Get the hash algorithm (normalized to lowercase, defaults to sha256)
   */
  getHashAlgorithm(): string {
    const algorithm = this.kayros.hashAlgorithm || 'sha256';
    return algorithm.toLowerCase();
  }

  /**
   * Check if this is the V0 format (legacy, used only for email proofs).
   * V0 envelopes have base64-encoded data that must be decoded before hashing.
   */
  isV0(): boolean {
    const m = this.kayros;
    return 'success' in m && !('hash' in m && m.hash);
  }
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
    dataHash?: string;
    remoteHash?: string;
  };
}

// Database types
export interface DatabaseQuery {
  data_type?: string;
  hash_type?: string;
  min_timestamp?: string;
  max_timestamp?: string;
  limit: number;
  offset: number;
  order_by: string; // ts_asc or ts_desc
}

export interface HashRecord {
  timestamp: string;
  data_type: string;
  data_item: string; // base64 or hex
  hash_type: string;
  hash_item: string; // base64 or hex
}

export interface DatabaseStats {
  total_hashes: number;
  count_by_type: Record<string, number>;
  min_timestamp: string;
  max_timestamp: string;
  timestamp_range: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
}

export interface TableBrowseRequest {
  table_name: string;
  offset: number;
  limit: number;
  order_by?: string;
  search_term?: string;
  search_column?: string;
}

export interface DatabaseRecord {
  data_type: string;
  data_item_hex: string;
  uuid_hex: string;
  hash_item_hex: string;
  prev_hash_hex?: string;
  hash_type: string;
  timestamp: string;
}

// Hash verification types
export interface HashVerifyRequest {
  prev_hash: string; // hex
  data_type: string;
  data_item: string; // hex
  uuid: string; // hex
  hash_type: string; // blake3 or xxh3
}

export interface HashVerifyResult {
  computed_hash: string; // hex
  hash_input_hex: string;
}

export interface ComputeHashRequest {
  hash_input_hex: string;
  hash_type: string; // blake3 or xxh3
}

// gRPC types
export interface SingleHashRequest {
  data_type: string; // 64 hex chars (32 bytes)
  data_item: string; // 64 hex chars (32 bytes)
}

export interface SingleHashResponse {
  success: boolean;
  message: string;
  data_type: string;
  data_item: string;
  computed_hash_hex: string;
  timeuuid_hex: string;
  data_type_hex: string;
  data_item_hex: string;
}

// Merkle proof types
export interface GenerateMerkleProofRequest {
  hash_item: string;
  data_type?: string;
  timestamp?: string;
}

export interface MerkleProof {
  target_hash_hex: string;
  data_type: string;
  timestamp: string;
  position: number;
  root_hash_hex: string;
  proof_hashes_hex: string[];
  levels: number;
  stored_root_hex: string;
  generated_at: string;
  lightnet_version: string;
  proof_format: string;
}

export interface VerifyMerkleProofRequest {
  target_hash_hex: string;
  proof_hashes_hex: string[]; // must be 256 entries
  levels: number;
  position: number;
  root_hash_hex: string;
}

export interface MerkleProofVerificationResult {
  valid: boolean;
  message: string;
  computed_root_hex: string;
  stored_root_hex: string;
  target_hash_hex: string;
  position: number;
}

// API Response wrapper
export interface APIResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
