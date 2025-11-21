/**
 * Provable SDK Configuration
 */

export const KayrosHost = "https://kayros.provable.dev";

export const API_ROUTES = {
  PROVE_SINGLE_HASH: "/api/grpc/single-hash",
  GET_RECORD_BY_HASH: "/api/database/record-by-hash",
} as const;

// "provable_sdk" (0x70726f7661626c655f73646b) padded to 32 bytes
export const DATA_TYPE = "70726f7661626c655f73646b00000000000000000000000000000000000000000000";

export function getKayrosUrl(route: string): string {
  return KayrosHost + route;
}

/**
 * Validates that a data type is exactly 32 bytes (64 hex characters)
 * @param dataType - The data type to validate
 * @throws Error if data type is not exactly 64 hex characters
 */
export function validateDataType(dataType: string): void {
  if (dataType.length !== 64) {
    throw new Error(`data_type must be exactly 64 hex characters (32 bytes), got ${dataType.length} characters`);
  }
  if (!/^[0-9a-fA-F]{64}$/.test(dataType)) {
    throw new Error('data_type must contain only valid hex characters (0-9, a-f, A-F)');
  }
}
