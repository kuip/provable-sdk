/**
 * Tests for config module
 */

import { describe, it, expect } from 'vitest';
import { getKayrosUrl, validateDataType, DATA_TYPE, KayrosHost } from './config';

describe('config', () => {
  describe('getKayrosUrl', () => {
    it('should build correct URL from route', () => {
      expect(getKayrosUrl('/api/test')).toBe(`${KayrosHost}/api/test`);
    });

    it('should concatenate host and route', () => {
      expect(getKayrosUrl('/api/test')).toBe(`${KayrosHost}/api/test`);
      expect(getKayrosUrl('api/test')).toBe(`${KayrosHost}api/test`);
    });
  });

  describe('validateDataType', () => {
    it('should accept short ASCII labels', () => {
      expect(() => validateDataType('provable_sdk')).not.toThrow();
    });

    it('should reject strings that are too long', () => {
      const tooLong = 'x'.repeat(33);
      expect(() => validateDataType(tooLong)).toThrow(
        'data_type must be at most 32 bytes'
      );
    });
  });

  describe('DATA_TYPE constant', () => {
    it('should be padded to 32 bytes', () => {
      expect(new TextEncoder().encode(DATA_TYPE)).toHaveLength(32);
      expect(DATA_TYPE.replace(/\0/g, '')).toBe('provable_sdk');
    });

    it('should pass its own validation', () => {
      expect(() => validateDataType(DATA_TYPE)).not.toThrow();
    });
  });
});
