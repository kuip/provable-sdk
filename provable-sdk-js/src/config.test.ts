/**
 * Tests for config module
 */

import { describe, it, expect } from 'vitest';
import { getKayrosUrl, DATA_TYPE, KayrosHost } from './config';

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

  describe('DATA_TYPE constant', () => {
    it('should be padded to 32 bytes', () => {
      expect(new TextEncoder().encode(DATA_TYPE)).toHaveLength(32);
      expect(DATA_TYPE.replace(/\0/g, '')).toBe('provable_sdk');
    });
  });
});
