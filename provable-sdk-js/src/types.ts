/**
 * Provable SDK Types
 */

import { keccak256, sha256 } from './hash';

export interface KayrosMetadata {
  hash?: string;
  hashAlgorithm?: string;
  timestamp?: {
    service: string;
    response: any;
  };
}

export interface KayrosMetadataV0 extends APIResponse<SingleHashResponse> {
  hash?: string;
  hashAlgorithm?: string;
}

export type AnyKayrosMetadata = KayrosMetadata | KayrosMetadataV0;

function decodeHexString(value: string): string | undefined {
  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  if (normalized.length === 0 || normalized.length % 2 !== 0) {
    return undefined;
  }
  if (!/^[0-9a-fA-F]+$/.test(normalized)) {
    return undefined;
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    const byte = Number.parseInt(normalized.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) {
      return undefined;
    }
    bytes[i / 2] = byte;
  }

  return new TextDecoder().decode(bytes);
}

function toDisplayLabel(value: string): string | undefined {
  return value.length > 0 ? value : undefined;
}

function decodeBase64ToBytes(value: string): Uint8Array | undefined {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length % 4 !== 0) {
    return undefined;
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    return undefined;
  }

  try {
    const binaryString = atob(normalized);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch {
    return undefined;
  }
}

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
   * Get the data type from the metadata.
   * V1 uses raw string data_type; V0 may expose data_type_hex.
   */
  getDataType(): string | undefined {
    const m = this.kayros as any;
    const response = m.timestamp?.response;
    const registerResponse = response?.response ?? response;

    const v1DataType = registerResponse?.data_type
      || registerResponse?.data?.data_type
      || response?.data?.data_type;
    if (typeof v1DataType === 'string' && v1DataType.length > 0) {
      return v1DataType;
    }

    const legacyDataTypeHex = m.data?.data_type_hex
      || registerResponse?.data_type_hex
      || registerResponse?.data?.data_type_hex
      || response?.data?.data_type_hex;
    if (typeof legacyDataTypeHex === 'string' && legacyDataTypeHex.length > 0) {
      return decodeHexString(legacyDataTypeHex) ?? legacyDataTypeHex;
    }

    return undefined;
  }

  /**
   * Get display label for the data type.
   */
  getDataTypeLabel(): string | undefined {
    const dataType = this.getDataType();
    if (!dataType) {
      return undefined;
    }

    const decoded = decodeHexString(dataType);
    if (decoded) {
      return toDisplayLabel(decoded);
    }
    return toDisplayLabel(dataType);
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
    if ('timestamp' in m && m.timestamp?.response) {
      const response = m.timestamp.response as any;
      const registerResponse = response?.response ?? response;
      if (response.data?.computed_hash_hex) {
        return response.data.computed_hash_hex;
      }
      if (registerResponse?.data?.computed_hash_hex) {
        return registerResponse.data.computed_hash_hex;
      }
      if (registerResponse?.computed_hash_hex) {
        return registerResponse.computed_hash_hex;
      }
      if (registerResponse?.hash) {
        return registerResponse.hash;
      }
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
    if ('timestamp' in m && m.timestamp?.response) {
      const response = m.timestamp.response as any;
      const registerResponse = response?.response ?? response;
      if (registerResponse?.data?.timeuuid_hex) {
        return registerResponse.data.timeuuid_hex;
      }
      if (registerResponse?.timeuuid_hex) {
        return registerResponse.timeuuid_hex;
      }
      if (registerResponse?.data?.timeuuid) {
        return registerResponse.data.timeuuid;
      }
      if (registerResponse?.timeuuid) {
        return registerResponse.timeuuid;
      }
      if (response.data?.timeuuid_hex) {
        return response.data.timeuuid_hex;
      }
      if (response.data?.timeuuid) {
        return response.data.timeuuid;
      }
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

  /**
   * Get the data as bytes.
   * For V0 (legacy email proofs): decodes base64 data to bytes.
   * For V1: stringifies objects to JSON and encodes as UTF-8 bytes.
   */
  getData(): Uint8Array {
    if (this.isV0()) {
      // V0 format: data is base64 encoded
      if (typeof this.data !== 'string') {
        throw new Error('V0 envelope data must be a base64 string');
      }
      const binaryString = atob(this.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } else {
      // V1 format: stringify objects to JSON, encode as UTF-8
      const dataString = typeof this.data === 'string'
        ? this.data
        : JSON.stringify(this.data);
      return new TextEncoder().encode(dataString);
    }
  }

  /**
   * Compute the data hash based on the envelope hash algorithm.
   */
  async computeDataHash(): Promise<string> {
    const algorithm = this.getHashAlgorithm();
    const computeForBytes = async (bytes: Uint8Array) => {
      if (algorithm === 'keccak256' || algorithm === 'keccak-256') {
        return keccak256(bytes);
      }
      return sha256(bytes);
    };

    if (typeof this.data !== 'string') {
      const data = this.getData();
      return computeForBytes(data);
    }

    const utf8Bytes = new TextEncoder().encode(this.data);
    const base64Bytes = decodeBase64ToBytes(this.data);
    const expectedDataHash = this.getDataHash()?.toLowerCase();

    // Try to match known proof hash first so mixed legacy/new proof shapes still verify.
    if (expectedDataHash) {
      if (base64Bytes) {
        const base64Hash = await computeForBytes(base64Bytes);
        if (base64Hash === expectedDataHash) {
          return base64Hash;
        }
      }

      const utf8Hash = await computeForBytes(utf8Bytes);
      if (utf8Hash === expectedDataHash) {
        return utf8Hash;
      }
    }

    // Fallback behavior:
    // - prefer decoded bytes for explicit V0 shape
    // - otherwise keep V1 behavior (hash raw string bytes)
    if (this.isV0() && base64Bytes) {
      return computeForBytes(base64Bytes);
    }

    return computeForBytes(utf8Bytes);
  }
}

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

export interface VerifyResult {
  valid: boolean;
  error?: string;
  details?: {
    hashMatch?: boolean;
    remoteMatch?: boolean;
    timestampMatch?: boolean;
    computedHash?: string;
    dataHash?: string;
    remoteHash?: string;
    proofTimeuuid?: string;
    remoteTimeuuid?: string;
    remoteRecord?: GetRecordResponse;
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
