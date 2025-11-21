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

// Export types
export type {
  KayrosMetadata,
  KayrosEnvelope,
  ProveSingleHashResponse,
  GetRecordResponse,
  VerifyResult,
} from './types';

// Export config
export { KayrosHost, API_ROUTES } from './config';
