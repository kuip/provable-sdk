import { keccak256, sha256 } from '@kuip/provable-sdk';
import type { KayrosData, ProofDataFormat } from './types';

type HashAlgorithm = 'sha256' | 'keccak256';
type JsonObject = Record<string, unknown>;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null;
}

function readPath(root: unknown, path: string[]): unknown {
  let current = root;
  for (const segment of path) {
    if (!isRecord(current) || !(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function decodeBase64ToBytes(value: string): Uint8Array | undefined {
  const compact = value.trim().replace(/\s+/g, '');
  if (compact.length === 0 || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(compact)) {
    return undefined;
  }
  const normalized = compact.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);

  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return undefined;
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function normalizeHash(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }
  const hex = value.trim().toLowerCase().replace(/^0x/, '');
  if (/^[0-9a-f]+$/.test(hex) && hex.length % 2 === 0) {
    return hex;
  }
  const bytes = decodeBase64ToBytes(value);
  return bytes ? bytesToHex(bytes) : undefined;
}

function encodeBytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function encodeTextToBase64(value: string): string {
  return encodeBytesToBase64(textEncoder.encode(value));
}

function encodeData(data: unknown): string {
  if (data instanceof Uint8Array) {
    return encodeBytesToBase64(data);
  }
  if (typeof data === 'string') {
    return encodeTextToBase64(data);
  }
  return encodeTextToBase64(JSON.stringify(data));
}

function decodeRequiredBase64(value: string): Uint8Array {
  const bytes = decodeBase64ToBytes(value);
  if (!bytes) {
    throw new Error('Invalid proof data: expected base64 string');
  }
  return bytes;
}

function normalizeHashAlgorithm(value: unknown): HashAlgorithm {
  if (typeof value !== 'string') {
    return 'sha256';
  }
  const normalized = value.toLowerCase().replace(/_/g, '').replace(/-/g, '');
  if (normalized === 'keccak256') {
    return 'keccak256';
  }
  return 'sha256';
}

async function hashBytes(bytes: Uint8Array, algorithm: HashAlgorithm): Promise<string> {
  if (algorithm === 'keccak256') {
    return keccak256(bytes);
  }
  return sha256(bytes);
}

/**
 * Canonical Kayros proof envelope.
 * - `data` is always base64 in serialized proof JSON.
 * - `kayros` is the timestamp metadata returned for that payload hash.
 */
export class KayrosEnvelope<T = unknown> {
  public readonly data: string;
  public readonly data_format: ProofDataFormat;
  public readonly kayros: KayrosData;
  private readonly dataBytes: Uint8Array;

  constructor(data: string, kayros: KayrosData, dataFormat: ProofDataFormat = '') {
    this.data = data.trim();
    this.data_format = dataFormat;
    this.kayros = kayros;
    this.dataBytes = decodeRequiredBase64(this.data);
  }

  static fromData<T>(data: T, kayros: KayrosData, dataFormat: ProofDataFormat = ''): KayrosEnvelope {
    return new KayrosEnvelope(encodeData(data), kayros, dataFormat);
  }

  static fromJSON(jsonText: string): KayrosEnvelope {
    const parsed = JSON.parse(jsonText) as { data?: unknown; data_format?: unknown; kayros?: KayrosData };
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid proof JSON: expected object');
    }
    if (!('data' in parsed) || !('kayros' in parsed)) {
      throw new Error('Invalid proof JSON: expected { data, kayros }');
    }
    if (typeof parsed.data !== 'string') {
      throw new Error('Invalid proof JSON: expected data to be base64 string');
    }
    if (!isRecord(parsed.kayros)) {
      throw new Error('Invalid proof JSON: expected kayros metadata object');
    }
    const dataFormat = typeof parsed.data_format === 'string'
      ? parsed.data_format as ProofDataFormat
      : '';
    return new KayrosEnvelope(parsed.data, parsed.kayros as KayrosData, dataFormat);
  }

  getDataFormat(): ProofDataFormat {
    return this.data_format || '';
  }

  getDataHash(): string | undefined {
    return normalizeHash(this.kayros.hash);
  }

  getDataType(): string | undefined {
    return firstString(readPath(this.kayros, ['timestamp', 'response', 'data', 'data_type']));
  }

  getDataTypeLabel(): string | undefined {
    return this.getDataType();
  }

  getDataTypeLookupCandidates(): Array<string | undefined> {
    return [this.getDataType()];
  }

  getKayrosHash(): string | undefined {
    return normalizeHash(
      firstString(
        readPath(this.kayros, ['timestamp', 'response', 'response', 'hash']),
        readPath(this.kayros, ['timestamp', 'response', 'data', 'hash_item']),
      ),
    );
  }

  getTimeUUID(): string | undefined {
    return firstString(
      readPath(this.kayros, ['timestamp', 'response', 'response', 'timeuuid']),
      readPath(this.kayros, ['timestamp', 'response', 'data', 'ts']),
    );
  }

  getHashAlgorithm(): string {
    return normalizeHashAlgorithm(this.kayros.hashAlgorithm);
  }

  getData(): Uint8Array {
    return this.dataBytes;
  }

  getDataText(): string {
    return textDecoder.decode(this.dataBytes);
  }

  parseData<U = unknown>(): U {
    return JSON.parse(this.getDataText()) as U;
  }

  toJSON(): { data: string; data_format: ProofDataFormat; kayros: KayrosData } {
    return {
      data: this.data,
      data_format: this.data_format,
      kayros: this.kayros,
    };
  }

  async computeDataHash(): Promise<string> {
    if (this.data_format === 'raw_hash') {
      return bytesToHex(this.dataBytes);
    }
    return hashBytes(this.dataBytes, this.getHashAlgorithm() as HashAlgorithm);
  }
}
