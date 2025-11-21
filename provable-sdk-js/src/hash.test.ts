/**
 * Tests for hash module
 */

import { describe, it, expect } from 'vitest';
import { hash, keccak256, hash_str, keccak256_str, sha256, sha256_str } from './hash';

describe('hash', () => {
  describe('keccak256', () => {
    it('should hash empty data', () => {
      const data = new Uint8Array([]);
      const result = keccak256(data);
      expect(result).toBe('c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470');
    });

    it('should hash simple data', () => {
      const data = new TextEncoder().encode('hello');
      const result = keccak256(data);
      expect(result).toHaveLength(64); // 32 bytes in hex
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce consistent results', () => {
      const data = new TextEncoder().encode('test');
      const hash1 = keccak256(data);
      const hash2 = keccak256(data);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different data', () => {
      const data1 = new TextEncoder().encode('hello');
      const data2 = new TextEncoder().encode('world');
      expect(keccak256(data1)).not.toBe(keccak256(data2));
    });
  });

  describe('keccak256_str', () => {
    it('should hash empty string', () => {
      const result = keccak256_str('');
      expect(result).toBe('c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470');
    });

    it('should hash simple string', () => {
      const result = keccak256_str('hello');
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should match keccak256 with encoded data', () => {
      const str = 'test string';
      const data = new TextEncoder().encode(str);
      expect(keccak256_str(str)).toBe(keccak256(data));
    });
  });

  describe('hash aliases', () => {
    it('hash should be same as keccak256', () => {
      const data = new TextEncoder().encode('test');
      expect(hash(data)).toBe(keccak256(data));
    });

    it('hash_str should be same as keccak256_str', () => {
      expect(hash_str('test')).toBe(keccak256_str('test'));
    });
  });

  describe('sha256', () => {
    it('should hash empty data', async () => {
      const data = new Uint8Array([]);
      const result = await sha256(data);
      expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should hash simple data', async () => {
      const data = new TextEncoder().encode('hello');
      const result = await sha256(data);
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce consistent results', async () => {
      const data = new TextEncoder().encode('test');
      const hash1 = await sha256(data);
      const hash2 = await sha256(data);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different data', async () => {
      const data1 = new TextEncoder().encode('hello');
      const data2 = new TextEncoder().encode('world');
      const hash1 = await sha256(data1);
      const hash2 = await sha256(data2);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('sha256_str', () => {
    it('should hash empty string', async () => {
      const result = await sha256_str('');
      expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should hash simple string', async () => {
      const result = await sha256_str('hello');
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should match sha256 with encoded data', async () => {
      const str = 'test string';
      const data = new TextEncoder().encode(str);
      expect(await sha256_str(str)).toBe(await sha256(data));
    });
  });

  describe('hash algorithms comparison', () => {
    it('keccak256 and sha256 should produce different hashes', async () => {
      const data = new TextEncoder().encode('test');
      const keccakHash = keccak256(data);
      const sha256Hash = await sha256(data);
      expect(keccakHash).not.toBe(sha256Hash);
    });
  });
});
