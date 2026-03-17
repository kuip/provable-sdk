/**
 * Provable SDK public types.
 */

export interface ProveSingleHashResponse {
  success: boolean;
  hash?: string;
  timeuuid?: string;
  encoding?: string;
  error?: string;
}

export interface GetRecordResponse {
  data_item: string;
  data_type: string;
  hash_item: string;
  hash_type: string;
  position: number;
  prev_hash?: string;
  ts: string;
}

export interface GetRecordByDataItemResponse {
  records: GetRecordResponse[];
  count: number;
}

export interface ComputeHashRequest {
  prev_hash?: string;
  data_type: string;
  data_item: string;
  timeuuid: string;
  hash_type: string;
}

export interface ComputeHashResponse {
  hash: string;
  hash_type: string;
  input_size: number;
}

export interface MerkleProofResponse {
  success: boolean;
  data_type: string;
  hash_item: string;
  proof: string[];
  root: string;
  position: number;
  levels: number;
  level_counts: number[];
  level_starts: number[];
  message?: string;
  error?: string;
}

export interface HashExistenceRequest {
  data_type: string;
  level: number;
  position: number;
  hash: string;
}

export interface HashExistenceResponse {
  exists: boolean;
  level: number;
  position: number;
  data_type: string;
  found_hash?: string;
  message?: string;
  error?: string;
}

export interface HashBatchRequest {
  data_type: string;
  level: number;
  start: number;
  hashes: string[];
}

export interface HashBatchResponse {
  data_type: string;
  level: number;
  start: number;
  count: number;
  results: number[];
  matches: number;
  mismatches: number;
  error?: string;
  message?: string;
}

export interface VerifyRequest {
  data_type?: string;
  dataType?: string;
  data_item?: string;
  dataItem?: string;
  kayros_hash?: string;
  kayrosHash?: string;
  apiKey?: string;
  api_key?: string;
  userKey?: string;
}

export interface VerifyLevelCheck {
  level: number;
  position: number;
  hash?: string;
}

export interface VerifyWithInclusionRequest extends VerifyRequest {
  trusted_root_hash?: string;
  trustedRootHash?: string;
  trusted_level?: number;
  trustedLevel?: number;
  trusted_position?: number;
  trustedPosition?: number;
  verify_batch_existence?: boolean;
  verifyBatchExistence?: boolean;
  level_checks?: VerifyLevelCheck[];
  levelChecks?: VerifyLevelCheck[];
}

export interface NormalizedKayrosRecord {
  data_type: string;
  data_type_hex: string;
  data_item: string;
  kayros_hash: string;
  prev_hash?: string;
  hash_type: string;
  uuid: string;
  timestamp: string;
  position: number;
  raw: GetRecordResponse;
}

export interface NormalizedMerkleProof {
  data_type: string;
  hash_item: string;
  proof: string[];
  root: string;
  position: number;
  levels: number;
  level_counts: number[];
  level_starts: number[];
  raw: MerkleProofResponse;
}

export interface LevelCheckResult {
  level: number;
  position: number;
  hash: string;
  valid: boolean;
  exists?: boolean;
  found_hash?: string;
  message?: string;
}

export interface BatchExistenceCheckResult {
  level: number;
  start: number;
  hashes: string[];
  valid: boolean;
  results: number[];
  matches: number;
  mismatches: number;
}

export interface VerifyResult {
  valid: boolean;
  error?: string;
  details?: {
    lookupMode: 'data_item' | 'kayros_hash';
    recordFound: boolean;
    ambiguous?: boolean;
    ambiguousCount?: number;
    dataTypeMatch?: boolean;
    dataItemMatch?: boolean;
    kayrosHashMatch?: boolean;
    recordHashMatch?: boolean;
    chainLinkMatch?: boolean;
    uuidTimestampMatch?: boolean;
    proofFetched?: boolean;
    proofDataTypeMatch?: boolean;
    proofHashItemMatch?: boolean;
    proofPathMatch?: boolean;
    targetPositionMatch?: boolean;
    trustedRootMatch?: boolean;
    trustedLevelMatch?: boolean;
    batchExistenceMatch?: boolean;
    pending?: boolean;
    maxLevel?: number;
    maxLevelPosition?: number;
    maxLevelHash?: string;
    computedRecordHash?: string;
    localRootHash?: string;
    record?: NormalizedKayrosRecord;
    previousRecord?: NormalizedKayrosRecord;
    proof?: NormalizedMerkleProof;
    levelChecks?: LevelCheckResult[];
    batchChecks?: BatchExistenceCheckResult[];
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
