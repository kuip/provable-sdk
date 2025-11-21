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
export { verify } from './verify';

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
  verify_hash,
  compute_hash_from_hex,
  send_single_grpc_request,
  generate_merkle_proof,
  verify_merkle_proof,
} from './lightnet';

// Export types
export type {
  KayrosMetadata,
  KayrosEnvelope,
  ProveSingleHashResponse,
  GetRecordResponse,
  VerifyResult,
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
  // gRPC types
  SingleHashRequest,
  SingleHashResponse,
  // Merkle proof types
  GenerateMerkleProofRequest,
  MerkleProof,
  VerifyMerkleProofRequest,
  MerkleProofVerificationResult,
  // API Response wrapper
  APIResponse,
} from './types';

// Export config
export { KayrosHost, API_ROUTES, DATA_TYPE } from './config';
