/**
 * Hashing utilities using keccak256 and SHA-256
 */

import { keccak256 as keccak256Impl } from 'js-sha3';

/**
 * Compute keccak256 hash of bytes
 * @param data - Input data as Uint8Array
 * @returns Hex string of the hash
 */
export function keccak256(data: Uint8Array): string {
  return keccak256Impl(data);
}

/**
 * Alias for keccak256
 */
export const hash = keccak256;

/**
 * Compute keccak256 hash of a UTF-8 string
 * @param str - Input string
 * @returns Hex string of the hash
 */
export function keccak256_str(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  return keccak256(data);
}

/**
 * Alias for keccak256_str
 */
export const hash_str = keccak256_str;

/**
 * Compute SHA-256 hash of bytes
 * @param data - Input data as Uint8Array
 * @returns Hex string of the hash
 */
export async function sha256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute SHA-256 hash of a UTF-8 string
 * @param str - Input string
 * @returns Hex string of the hash
 */
export async function sha256_str(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  return sha256(data);
}
