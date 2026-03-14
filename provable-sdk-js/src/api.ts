/**
 * Kayros API client
 */

import { getKayrosUrl, API_ROUTES, DATA_TYPE, formatDataTypeForQuery, formatHashForQuery, getDefaultHeaders } from './config';
import type { ProveSingleHashResponse, GetRecordResponse } from './types';
import type { ProveOptions, RecordLookupOptions } from './options';

function normalizeProveOptions(dataTypeOrOptions?: string | ProveOptions): ProveOptions {
  if (typeof dataTypeOrOptions === 'string') {
    return { dataType: dataTypeOrOptions };
  }
  return dataTypeOrOptions ?? {};
}

function normalizeRecordLookupOptions(dataTypeOrOptions?: string | RecordLookupOptions): RecordLookupOptions {
  if (typeof dataTypeOrOptions === 'string') {
    return { dataType: dataTypeOrOptions };
  }
  return dataTypeOrOptions ?? {};
}

/**
 * Call Kayros API to prove a single hash
 * @param dataHash - The hash to prove (hex string)
 * @param dataType - Optional data type identifier (defaults to "provable_sdk" padded to 32 bytes)
 * @returns Promise with the Kayros response
 */
export async function prove_single_hash(
  dataHash: string,
  dataTypeOrOptions?: string | ProveOptions
): Promise<ProveSingleHashResponse> {
  const url = getKayrosUrl(API_ROUTES.PROVE_SINGLE_HASH);
  const options = normalizeProveOptions(dataTypeOrOptions);
  const dt = options.dataType ?? DATA_TYPE;

  const response = await fetch(url, {
    method: 'POST',
    headers: getDefaultHeaders(options),
    body: JSON.stringify({
      data_item: dataHash,
      data_type: dt,
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
export async function get_record_by_hash(
  recordHash: string,
  dataTypeOrOptions?: string | RecordLookupOptions
): Promise<GetRecordResponse> {
  const hash = formatHashForQuery(recordHash);
  const options = normalizeRecordLookupOptions(dataTypeOrOptions);
  let query = `${API_ROUTES.GET_RECORD_BY_HASH}?hash=${encodeURIComponent(hash)}`;
  if (options.dataType === undefined) {
    query += `&data_type=${encodeURIComponent(formatDataTypeForQuery(DATA_TYPE))}`;
  } else if (options.dataType !== null) {
    query += `&data_type=${encodeURIComponent(formatDataTypeForQuery(options.dataType))}`;
  }
  const url = getKayrosUrl(query);

  const response = await fetch(url, {
    method: 'GET',
    headers: getDefaultHeaders(options),
  });

  if (!response.ok) {
    throw new Error(`Kayros API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as GetRecordResponse;
}
