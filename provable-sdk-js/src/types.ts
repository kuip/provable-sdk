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
