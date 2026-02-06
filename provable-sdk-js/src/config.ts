/**
 * Provable SDK Configuration
 */

export const KayrosHost = "https://kayros.provable.dev";

export const API_ROUTES = {
  PROVE_SINGLE_HASH: "/api/lightnet/grpc/single-hash",
  GET_RECORD_BY_HASH: "/api/lightnet/database/record-by-hash",
} as const;

// Default data type (provable_sdk padded to 32 bytes)
export const DATA_TYPE = "provable_sdk" + "\u0000".repeat(20);

export function getKayrosUrl(route: string): string {
  return KayrosHost + route;
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
export function validateDataType(dataType: string): void {
  const byteLength = new TextEncoder().encode(dataType).length;
  if (byteLength > 32) {
    throw new Error(`data_type must be at most 32 bytes, got ${byteLength} bytes`);
  }
}

/**
 * Format data type for Kayros query params (pad to 32 bytes with nulls).
 */
export function formatDataTypeForQuery(dataType: string): string {
  const bytes = new TextEncoder().encode(dataType);
  const trimmed = bytes.slice(0, 32);
  let end = trimmed.length;
  while (end > 0 && trimmed[end - 1] === 0) {
    end -= 1;
  }
  return String.fromCharCode(...trimmed.slice(0, end));
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
