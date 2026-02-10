/**
 * Provable SDK Configuration
 */

export const KayrosHost = "https://kayros.provable.dev";

export const API_ROUTES = {
  PROVE_SINGLE_HASH: "/api/lightnet/grpc/single-hash",
  GET_RECORD_BY_HASH: "/api/lightnet/database/record-by-hash",
} as const;

// Default data type (provable_sdk padded to 32 bytes)
export const DATA_TYPE = "provable_sdk\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000";
export const DEFAULT_USER_KEY = "0x0000000000000000000000000000000000000000000000000000000000000001";

let userKey = DEFAULT_USER_KEY;

export function getKayrosUrl(route: string): string {
  return KayrosHost + route;
}

export function setUserKey(key: string): void {
  userKey = key;
}

export function getUserKey(): string {
  return userKey;
}

export function getDefaultHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-User-Key': getUserKey(),
  };
}

/**
 * Get the URL to view a record on Kayros by its hash
 * @param hash - The hash to look up
 * @returns The full URL to view the record
 */
export function getRecordUrl(hash: string, dataType?: string): string {
  const dt = formatDataTypeForQuery(dataType ?? DATA_TYPE);
  const recordHash = formatHashForQuery(hash);
  return `${KayrosHost}${API_ROUTES.GET_RECORD_BY_HASH}?hash=${encodeURIComponent(recordHash)}&data_type=${encodeURIComponent(dt)}`;
}

/**
 * Validates that a data type is at most 32 bytes
 * @param dataType - The data type to validate
 * @throws Error if data type exceeds 32 bytes
 */
/**
 * Format data type for Kayros query params (pad to 32 bytes with nulls).
 */
export function formatDataTypeForQuery(dataType: string): string {
  const normalized = dataType.startsWith('0x') ? dataType.slice(2) : dataType;
  if (
    normalized.length > 0 &&
    normalized.length % 2 === 0 &&
    /^[0-9a-fA-F]+$/.test(normalized)
  ) {
    const bytes = new Uint8Array(normalized.length / 2);
    for (let i = 0; i < normalized.length; i += 2) {
      const byte = Number.parseInt(normalized.slice(i, i + 2), 16);
      if (Number.isNaN(byte)) {
        return dataType;
      }
      bytes[i / 2] = byte;
    }
    return new TextDecoder().decode(bytes);
  }

  return dataType;
}

/**
 * Format hash for Kayros query params (base64 when input is 64-hex).
 */
export function formatHashForQuery(hash: string): string {
  if (/^[0-9a-fA-F]{64}$/.test(hash)) {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 64; i += 2) {
      bytes[i / 2] = Number.parseInt(hash.slice(i, i + 2), 16);
    }
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let output = '';
    let i = 0;
    while (i < bytes.length) {
      const b1 = bytes[i++] ?? 0;
      const b2 = bytes[i++] ?? 0;
      const b3 = bytes[i++] ?? 0;
      const triplet = (b1 << 16) | (b2 << 8) | b3;
      const idx1 = (triplet >> 18) & 0x3f;
      const idx2 = (triplet >> 12) & 0x3f;
      const idx3 = (triplet >> 6) & 0x3f;
      const idx4 = triplet & 0x3f;
      output += alphabet[idx1] + alphabet[idx2] + alphabet[idx3] + alphabet[idx4];
    }
    const padding = bytes.length % 3;
    if (padding === 1) {
      output = output.slice(0, -2) + '==';
    } else if (padding === 2) {
      output = output.slice(0, -1) + '=';
    }
    return output;
  }
  return hash;
}
