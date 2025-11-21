/**
 * Prove data utilities
 */

import { keccak256, keccak256_str } from './hash';
import { prove_single_hash } from './api';
import type { ProveSingleHashResponse } from './types';

/**
 * Prove data by computing its hash and calling Kayros API
 * @param data - Input data as Uint8Array
 * @returns Promise with the Kayros response
 */
export async function prove_data(data: Uint8Array): Promise<ProveSingleHashResponse> {
  const dataHash = keccak256(data);
  return await prove_single_hash(dataHash);
}

/**
 * Prove string data by computing its hash and calling Kayros API
 * @param str - Input string
 * @returns Promise with the Kayros response
 */
export async function prove_data_str(str: string): Promise<ProveSingleHashResponse> {
  const dataHash = keccak256_str(str);
  return await prove_single_hash(dataHash);
}
