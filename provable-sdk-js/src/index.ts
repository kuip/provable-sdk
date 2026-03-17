/**
 * Provable SDK for TypeScript/JavaScript
 */

// Export hash functions
export { hash, keccak256, hash_str, keccak256_str, sha256, sha256_str } from './hash';

// Export API functions
export { prove_single_hash, get_record_by_hash } from './api';

// Export prove functions
export { prove_data, prove_data_str } from './prove';

// Export verify function
export { verify, verifyWithInclusion } from './verify';

// Export Lightnet API functions
export {
  query_hashes,
  get_database_stats,
  get_latest_hashes,
  get_tables,
  get_table_schema,
  browse_table,
  get_record,
  get_record_with_prev_hash,
  get_record_by_data_item,
  verify_hash,
  compute_hash_from_hex,
  send_single_grpc_request,
  get_merkle_proof,
  verify_hash_existence,
  verify_hash_batch,
} from './lightnet';

// Export types
export type {
  ProveSingleHashResponse,
  GetRecordResponse,
  GetRecordByDataItemResponse,
  VerifyResult,
  VerifyRequest,
  VerifyWithInclusionRequest,
  VerifyLevelCheck,
  NormalizedKayrosRecord,
  NormalizedMerkleProof,
  LevelCheckResult,
  BatchExistenceCheckResult,
  // Database types
  DatabaseQuery,
  HashRecord,
  DatabaseStats,
  ColumnInfo,
  TableBrowseRequest,
  DatabaseRecord,
  // Hash verification types
  HashVerifyRequest,
  HashVerifyResult,
  ComputeHashRequest,
  ComputeHashResponse,
  HashExistenceRequest,
  HashExistenceResponse,
  HashBatchRequest,
  HashBatchResponse,
  // gRPC types
  SingleHashRequest,
  SingleHashResponse,
  // Merkle proof types
  MerkleProofResponse,
  // API Response wrapper
  APIResponse,
} from './types';
export type {
  ApiKeyOptions,
  ProveOptions,
  RecordLookupOptions,
} from './options';

// Export config
export {
  KayrosHost,
  API_ROUTES,
  DATA_TYPE,
  DEFAULT_API_KEY,
  DEFAULT_USER_KEY,
  getKayrosUrl,
  getKayrosHost,
  setKayrosHost,
  getRecordUrl,
  setApiKey,
  getApiKey,
  setUserKey,
  getUserKey,
} from './config';
