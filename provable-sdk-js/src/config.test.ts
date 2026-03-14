/**
 * Tests for config module
 */

import { describe, it, expect } from 'vitest';
import {
  getKayrosUrl,
  DATA_TYPE,
  KayrosHost,
  DEFAULT_API_KEY,
  DEFAULT_USER_KEY,
  getApiKey,
  getUserKey,
  setApiKey,
  setUserKey,
} from './config';

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

  describe('user key config', () => {
    it('should default to the expected key', () => {
      setUserKey(DEFAULT_USER_KEY);
      expect(getUserKey()).toBe(DEFAULT_USER_KEY);
    });

    it('should allow setting a custom key', () => {
      const customKey = '0xabc123';
      setUserKey(customKey);
      expect(getUserKey()).toBe(customKey);
      setUserKey(DEFAULT_USER_KEY);
    });
  });

  describe('api key aliases', () => {
    it('should expose the api key alias constants and getters', () => {
      setApiKey(DEFAULT_API_KEY);
      expect(getApiKey()).toBe(DEFAULT_USER_KEY);
      expect(getApiKey()).toBe(getUserKey());
    });
  });
});
