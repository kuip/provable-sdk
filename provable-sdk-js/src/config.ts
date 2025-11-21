/**
 * Provable SDK Configuration
 */

export const KayrosHost = "https://kayros.provable.dev";

export const API_ROUTES = {
  PROVE_SINGLE_HASH: "/api/grpc/single-hash",
  GET_RECORD_BY_HASH: "/api/database/record-by-hash",
} as const;

export const DATA_TYPE = "70726f7661626c655f666f726d73000000000000000000000000000000000000";

export function getKayrosUrl(route: string): string {
  return KayrosHost + route;
}
