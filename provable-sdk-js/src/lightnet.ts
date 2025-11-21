/**
 * Lightnet API client - Database, Hash, and Merkle operations
 */

import { getKayrosUrl } from './config';
import type {
  APIResponse,
  DatabaseQuery,
  HashRecord,
  DatabaseStats,
  ColumnInfo,
  TableBrowseRequest,
  DatabaseRecord,
  HashVerifyRequest,
  HashVerifyResult,
  ComputeHashRequest,
  SingleHashRequest,
  SingleHashResponse,
  GenerateMerkleProofRequest,
  MerkleProof,
  VerifyMerkleProofRequest,
  MerkleProofVerificationResult,
} from './types';

// Database Operations

/**
 * Query hash records from the database
 * @param query - Database query parameters
 * @returns Promise with hash records
 */
export async function query_hashes(query: DatabaseQuery): Promise<APIResponse<HashRecord[]>> {
  const url = getKayrosUrl('/api/database/query');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as APIResponse<HashRecord[]>;
}

/**
 * Get database statistics
 * @returns Promise with database stats
 */
export async function get_database_stats(): Promise<APIResponse<DatabaseStats>> {
  const url = getKayrosUrl('/api/database/stats');

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as APIResponse<DatabaseStats>;
}

/**
 * Get the most recent hash records
 * @param limit - Number of records to retrieve (default 50)
 * @returns Promise with latest hash records
 */
export async function get_latest_hashes(limit: number = 50): Promise<APIResponse<HashRecord[]>> {
  const url = getKayrosUrl(`/api/database/latest?limit=${limit}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as APIResponse<HashRecord[]>;
}

/**
 * Get all database tables
 * @returns Promise with table names
 */
export async function get_tables(): Promise<APIResponse<string[]>> {
  const url = getKayrosUrl('/api/database/tables');

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as APIResponse<string[]>;
}

/**
 * Get schema for a specific table
 * @param tableName - Name of the table
 * @returns Promise with column information
 */
export async function get_table_schema(tableName: string): Promise<APIResponse<ColumnInfo[]>> {
  const url = getKayrosUrl(`/api/database/schema?table=${encodeURIComponent(tableName)}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as APIResponse<ColumnInfo[]>;
}

/**
 * Browse table data with pagination
 * @param request - Table browse parameters
 * @returns Promise with table rows
 */
export async function browse_table(request: TableBrowseRequest): Promise<APIResponse<unknown[]>> {
  const url = getKayrosUrl('/api/database/browse');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as APIResponse<unknown[]>;
}

/**
 * Get a record by UUID
 * @param uuid - Record UUID (hex string)
 * @returns Promise with database record
 */
export async function get_record(uuid: string): Promise<APIResponse<DatabaseRecord>> {
  const url = getKayrosUrl(`/api/database/record?uuid=${encodeURIComponent(uuid)}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as APIResponse<DatabaseRecord>;
}

/**
 * Get a record by UUID with previous hash
 * @param uuid - Record UUID (hex string)
 * @returns Promise with database record including prev_hash
 */
export async function get_record_with_prev_hash(uuid: string): Promise<APIResponse<DatabaseRecord>> {
  const url = getKayrosUrl(`/api/database/record-with-prev?uuid=${encodeURIComponent(uuid)}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as APIResponse<DatabaseRecord>;
}

// Hash Operations

/**
 * Verify a hash computation
 * @param request - Hash verification request
 * @returns Promise with hash verification result
 */
export async function verify_hash(request: HashVerifyRequest): Promise<APIResponse<HashVerifyResult>> {
  const url = getKayrosUrl('/api/verify-hash');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as APIResponse<HashVerifyResult>;
}

/**
 * Compute hash from hex input
 * @param request - Compute hash request
 * @returns Promise with computed hash result
 */
export async function compute_hash_from_hex(request: ComputeHashRequest): Promise<APIResponse<HashVerifyResult>> {
  const url = getKayrosUrl('/api/compute-hash-from-hex');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as APIResponse<HashVerifyResult>;
}

// gRPC Operations

/**
 * Send a single gRPC request to Lightnet
 * @param request - Single hash request with data_type and data_item
 * @returns Promise with gRPC response
 */
export async function send_single_grpc_request(request: SingleHashRequest): Promise<APIResponse<SingleHashResponse>> {
  const url = getKayrosUrl('/api/grpc/single-hash');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as APIResponse<SingleHashResponse>;
}

// Merkle Proof Operations

/**
 * Generate a Merkle proof for a specific hash
 * @param request - Merkle proof generation request
 * @returns Promise with Merkle proof
 */
export async function generate_merkle_proof(request: GenerateMerkleProofRequest): Promise<APIResponse<MerkleProof>> {
  const url = getKayrosUrl('/api/merkle/generate-proof');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as APIResponse<MerkleProof>;
}

/**
 * Verify a Merkle proof
 * @param request - Merkle proof verification request
 * @returns Promise with verification result
 */
export async function verify_merkle_proof(request: VerifyMerkleProofRequest): Promise<APIResponse<MerkleProofVerificationResult>> {
  const url = getKayrosUrl('/api/merkle/verify-proof');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as APIResponse<MerkleProofVerificationResult>;
}
