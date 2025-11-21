/**
 * Kayros API client
 */

import { getKayrosUrl, API_ROUTES, DATA_TYPE } from './config';
import type { ProveSingleHashResponse, GetRecordResponse } from './types';

/**
 * Call Kayros API to prove a single hash
 * @param dataHash - The hash to prove (hex string)
 * @returns Promise with the Kayros response
 */
export async function prove_single_hash(dataHash: string): Promise<ProveSingleHashResponse> {
  const url = getKayrosUrl(API_ROUTES.PROVE_SINGLE_HASH);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data_item: dataHash,
      data_type: DATA_TYPE,
    }),
  });

  if (!response.ok) {
    throw new Error(`Kayros API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as ProveSingleHashResponse;
}

/**
 * Get a Kayros record by hash
 * @param recordHash - The hash of the record to retrieve
 * @returns Promise with the record data
 */
export async function get_record_by_hash(recordHash: string): Promise<GetRecordResponse> {
  const url = getKayrosUrl(`${API_ROUTES.GET_RECORD_BY_HASH}?hash_item=${recordHash}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Kayros API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as GetRecordResponse;
}
