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
    it('should accept valid 64-character hex string', () => {
      const validDataType = '70726f7661626c655f73646b0000000000000000000000000000000000000000';
      expect(() => validateDataType(validDataType)).not.toThrow();
    });

    it('should accept uppercase hex characters', () => {
      const validDataType = '70726F7661626C655F73646B0000000000000000000000000000000000000000';
      expect(() => validateDataType(validDataType)).not.toThrow();
    });

    it('should reject strings that are too short', () => {
      expect(() => validateDataType('abc123')).toThrow(
        'data_type must be exactly 64 hex characters (32 bytes), got 6 characters'
      );
    });

    it('should reject strings that are too long', () => {
      const tooLong = '70726f7661626c655f73646b' + '0'.repeat(100);
      expect(() => validateDataType(tooLong)).toThrow(
        /data_type must be exactly 64 hex characters/
      );
    });

    it('should reject non-hex characters', () => {
      const invalidHex = 'gggg' + '0'.repeat(60);
      expect(() => validateDataType(invalidHex)).toThrow(
        'data_type must contain only valid hex characters (0-9, a-f, A-F)'
      );
    });

    it('should reject strings with special characters', () => {
      const withSpecial = '70726f76@' + '0'.repeat(55);
      expect(() => validateDataType(withSpecial)).toThrow(
        'data_type must contain only valid hex characters'
      );
    });
  });

  describe('DATA_TYPE constant', () => {
    it('should be exactly 64 characters', () => {
      expect(DATA_TYPE).toHaveLength(64);
    });

    it('should contain only hex characters', () => {
      expect(DATA_TYPE).toMatch(/^[0-9a-fA-F]{64}$/);
    });

    it('should start with "provable_sdk" in hex', () => {
      // "provable_sdk" = 0x70726f7661626c655f73646b
      expect(DATA_TYPE.startsWith('70726f7661626c655f73646b')).toBe(true);
    });

    it('should pass its own validation', () => {
      expect(() => validateDataType(DATA_TYPE)).not.toThrow();
    });
  });
});
