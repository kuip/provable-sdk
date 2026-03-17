import { keccak256, sha256 } from 'provable-sdk-js';
import type { AnyKayrosMetadata } from './types';

type HashAlgorithm = 'sha256' | 'keccak256';
type MetadataKind = 'timestamp_v1' | 'legacy_v0' | 'unknown';
type JsonObject = Record<string, unknown>;

interface MetadataAccessor {
  readonly kind: MetadataKind;
  getDataHash(): string | undefined;
  getDataType(): string | undefined;
  getDataTypeLabel(): string | undefined;
  getDataTypeLookupCandidates(): Array<string | undefined>;
  getKayrosHash(): string | undefined;
  getTimeUUID(): string | undefined;
  getHashAlgorithm(): HashAlgorithm;
}

interface EnvelopeOptions {
  rawDataJson?: string;
}

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

function decodeHexString(value: string): string | undefined {
  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  if (normalized.length === 0 || normalized.length % 2 !== 0) {
    return undefined;
  }
  if (!/^[0-9a-fA-F]+$/.test(normalized)) {
    return undefined;
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    const byte = Number.parseInt(normalized.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) {
      return undefined;
    }
    bytes[i / 2] = byte;
  }
  return textDecoder.decode(bytes);
}

function decodeBase64ToBytes(value: string): Uint8Array | undefined {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length % 4 !== 0) {
    return undefined;
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    return undefined;
  }

  try {
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return undefined;
  }
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

function toDataTypeLabel(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const decoded = decodeHexString(value);
  return decoded ?? value;
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}

class TimestampMetadataAccessor implements MetadataAccessor {
  readonly kind: MetadataKind = 'timestamp_v1';

  constructor(private readonly kayros: JsonObject) {}

  private get timestampResponse(): unknown {
    return readPath(this.kayros, ['timestamp', 'response']);
  }

  private get registerResponse(): unknown {
    const response = this.timestampResponse;
    return readPath(response, ['response']) ?? response;
  }

  private get rawDataType(): string | undefined {
    return firstString(
      readPath(this.registerResponse, ['data_type']),
      readPath(this.registerResponse, ['data', 'data_type']),
      readPath(this.timestampResponse, ['data', 'data_type'])
    );
  }

  private get legacyDataTypeHex(): string | undefined {
    return firstString(
      readPath(this.registerResponse, ['data_type_hex']),
      readPath(this.registerResponse, ['data', 'data_type_hex']),
      readPath(this.timestampResponse, ['data', 'data_type_hex']),
      readPath(this.kayros, ['data', 'data_type_hex'])
    );
  }

  getDataHash(): string | undefined {
    return firstString(
      readPath(this.kayros, ['hash']),
      readPath(this.registerResponse, ['data_item_hex']),
      readPath(this.registerResponse, ['data', 'data_item_hex']),
      readPath(this.timestampResponse, ['data', 'data_item_hex']),
      readPath(this.kayros, ['data', 'data_item_hex'])
    );
  }

  getDataType(): string | undefined {
    const raw = this.rawDataType;
    if (raw) {
      return raw;
    }
    const hex = this.legacyDataTypeHex;
    if (!hex) {
      return undefined;
    }
    return decodeHexString(hex) ?? hex;
  }

  getDataTypeLabel(): string | undefined {
    return toDataTypeLabel(this.getDataType());
  }

  getDataTypeLookupCandidates(): Array<string | undefined> {
    const raw = this.rawDataType;
    const decodedRaw = raw ? decodeHexString(raw) : undefined;
    const type = this.getDataType();
    const label = this.getDataTypeLabel();
    const decodedType = type ? decodeHexString(type) : undefined;
    return uniqueStrings([raw, decodedRaw, type, decodedType, label]);
  }

  getKayrosHash(): string | undefined {
    return firstString(
      readPath(this.timestampResponse, ['data', 'computed_hash_hex']),
      readPath(this.registerResponse, ['data', 'computed_hash_hex']),
      readPath(this.registerResponse, ['computed_hash_hex']),
      readPath(this.registerResponse, ['hash']),
      readPath(this.kayros, ['data', 'computed_hash_hex'])
    );
  }

  getTimeUUID(): string | undefined {
    return firstString(
      readPath(this.registerResponse, ['data', 'timeuuid_hex']),
      readPath(this.registerResponse, ['timeuuid_hex']),
      readPath(this.registerResponse, ['data', 'timeuuid']),
      readPath(this.registerResponse, ['timeuuid']),
      readPath(this.timestampResponse, ['data', 'timeuuid_hex']),
      readPath(this.timestampResponse, ['data', 'timeuuid']),
      readPath(this.kayros, ['data', 'timeuuid_hex'])
    );
  }

  getHashAlgorithm(): HashAlgorithm {
    return normalizeHashAlgorithm(readPath(this.kayros, ['hashAlgorithm']));
  }
}

class LegacyMetadataAccessor implements MetadataAccessor {
  readonly kind: MetadataKind = 'legacy_v0';

  constructor(private readonly kayros: JsonObject) {}

  private get rawDataType(): string | undefined {
    return firstString(
      readPath(this.kayros, ['data', 'data_type']),
      readPath(this.kayros, ['data_type'])
    );
  }

  private get legacyDataTypeHex(): string | undefined {
    return firstString(
      readPath(this.kayros, ['data', 'data_type_hex']),
      readPath(this.kayros, ['data_type_hex']),
      readPath(this.kayros, ['timestamp', 'response', 'data', 'data_type_hex'])
    );
  }

  getDataHash(): string | undefined {
    return firstString(
      readPath(this.kayros, ['hash']),
      readPath(this.kayros, ['data', 'data_item_hex']),
      readPath(this.kayros, ['timestamp', 'response', 'data', 'data_item_hex'])
    );
  }

  getDataType(): string | undefined {
    const raw = this.rawDataType;
    if (raw) {
      return raw;
    }
    const hex = this.legacyDataTypeHex;
    if (!hex) {
      return undefined;
    }
    return decodeHexString(hex) ?? hex;
  }

  getDataTypeLabel(): string | undefined {
    return toDataTypeLabel(this.getDataType());
  }

  getDataTypeLookupCandidates(): Array<string | undefined> {
    const raw = this.rawDataType;
    const decodedRaw = raw ? decodeHexString(raw) : undefined;
    const type = this.getDataType();
    const label = this.getDataTypeLabel();
    const decodedType = type ? decodeHexString(type) : undefined;
    return uniqueStrings([raw, decodedRaw, type, decodedType, label]);
  }

  getKayrosHash(): string | undefined {
    return firstString(
      readPath(this.kayros, ['data', 'computed_hash_hex']),
      readPath(this.kayros, ['computed_hash_hex']),
      readPath(this.kayros, ['timestamp', 'response', 'data', 'computed_hash_hex'])
    );
  }

  getTimeUUID(): string | undefined {
    return firstString(
      readPath(this.kayros, ['data', 'timeuuid_hex']),
      readPath(this.kayros, ['timeuuid_hex']),
      readPath(this.kayros, ['timestamp', 'response', 'data', 'timeuuid_hex'])
    );
  }

  getHashAlgorithm(): HashAlgorithm {
    return normalizeHashAlgorithm(readPath(this.kayros, ['hashAlgorithm']));
  }
}

class UnknownMetadataAccessor implements MetadataAccessor {
  readonly kind: MetadataKind = 'unknown';
  private readonly timestampAccessor: TimestampMetadataAccessor;
  private readonly legacyAccessor: LegacyMetadataAccessor;

  constructor(private readonly kayros: JsonObject) {
    this.timestampAccessor = new TimestampMetadataAccessor(kayros);
    this.legacyAccessor = new LegacyMetadataAccessor(kayros);
  }

  getDataHash(): string | undefined {
    return this.timestampAccessor.getDataHash() ?? this.legacyAccessor.getDataHash();
  }

  getDataType(): string | undefined {
    return this.timestampAccessor.getDataType() ?? this.legacyAccessor.getDataType();
  }

  getDataTypeLabel(): string | undefined {
    return this.timestampAccessor.getDataTypeLabel() ?? this.legacyAccessor.getDataTypeLabel();
  }

  getDataTypeLookupCandidates(): Array<string | undefined> {
    return uniqueStrings([
      ...this.timestampAccessor.getDataTypeLookupCandidates(),
      ...this.legacyAccessor.getDataTypeLookupCandidates(),
    ]);
  }

  getKayrosHash(): string | undefined {
    return this.timestampAccessor.getKayrosHash() ?? this.legacyAccessor.getKayrosHash();
  }

  getTimeUUID(): string | undefined {
    return this.timestampAccessor.getTimeUUID() ?? this.legacyAccessor.getTimeUUID();
  }

  getHashAlgorithm(): HashAlgorithm {
    return normalizeHashAlgorithm(readPath(this.kayros, ['hashAlgorithm']));
  }
}

function createMetadataAccessor(kayros: AnyKayrosMetadata): MetadataAccessor {
  if (!isRecord(kayros)) {
    return new UnknownMetadataAccessor({});
  }
  if (readPath(kayros, ['timestamp', 'response']) !== undefined) {
    return new TimestampMetadataAccessor(kayros);
  }
  if (
    readPath(kayros, ['data', 'data_item_hex']) !== undefined
    || readPath(kayros, ['data', 'computed_hash_hex']) !== undefined
    || readPath(kayros, ['success']) !== undefined
  ) {
    return new LegacyMetadataAccessor(kayros);
  }
  return new UnknownMetadataAccessor(kayros);
}

class EnvelopeDataAccessor<T = unknown> {
  constructor(
    private readonly data: T,
    private readonly metadataKind: MetadataKind,
    private readonly rawDataJson?: string
  ) {}

  private getUtf8Bytes(value: string): Uint8Array {
    return textEncoder.encode(value);
  }

  private getObjectBytes(): Uint8Array {
    if (typeof this.rawDataJson === 'string') {
      return this.getUtf8Bytes(this.rawDataJson);
    }
    return this.getUtf8Bytes(JSON.stringify(this.data));
  }

  getPrimaryBytes(): Uint8Array {
    if (typeof this.data !== 'string') {
      return this.getObjectBytes();
    }

    const base64Bytes = decodeBase64ToBytes(this.data);
    if (this.metadataKind === 'legacy_v0' && base64Bytes) {
      return base64Bytes;
    }
    return this.getUtf8Bytes(this.data);
  }

  getByteCandidates(): Uint8Array[] {
    const candidates: Uint8Array[] = [];
    const seen = new Set<string>();
    const add = (bytes: Uint8Array | undefined) => {
      if (!bytes) {
        return;
      }
      const key = Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      candidates.push(bytes);
    };

    if (typeof this.data === 'string') {
      const utf8Bytes = this.getUtf8Bytes(this.data);
      const base64Bytes = decodeBase64ToBytes(this.data);
      if (this.metadataKind === 'legacy_v0') {
        add(base64Bytes);
        add(utf8Bytes);
      } else {
        add(utf8Bytes);
        add(base64Bytes);
      }
      return candidates;
    }

    if (typeof this.rawDataJson === 'string') {
      add(this.getUtf8Bytes(this.rawDataJson));
    }
    add(this.getUtf8Bytes(JSON.stringify(this.data)));
    return candidates;
  }
}

function skipWhitespace(text: string, index: number): number {
  let i = index;
  while (i < text.length && /\s/.test(text[i])) {
    i += 1;
  }
  return i;
}

function readJsonStringToken(text: string, start: number): { value: string; end: number } | undefined {
  if (text[start] !== '"') {
    return undefined;
  }

  let i = start + 1;
  let escaped = false;
  while (i < text.length) {
    const char = text[i];
    if (escaped) {
      escaped = false;
      i += 1;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      i += 1;
      continue;
    }
    if (char === '"') {
      const raw = text.slice(start, i + 1);
      return {
        value: JSON.parse(raw) as string,
        end: i + 1,
      };
    }
    i += 1;
  }
  return undefined;
}

function readJsonValueEnd(text: string, start: number): number | undefined {
  if (start >= text.length) {
    return undefined;
  }

  const firstChar = text[start];
  if (firstChar === '"') {
    const token = readJsonStringToken(text, start);
    return token?.end;
  }

  if (firstChar === '{' || firstChar === '[') {
    const stack: string[] = [firstChar];
    let i = start + 1;
    let inString = false;
    let escaped = false;
    while (i < text.length) {
      const char = text[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        i += 1;
        continue;
      }

      if (char === '"') {
        inString = true;
        i += 1;
        continue;
      }
      if (char === '{' || char === '[') {
        stack.push(char);
        i += 1;
        continue;
      }
      if (char === '}' || char === ']') {
        const opener = stack.pop();
        if (!opener) {
          return undefined;
        }
        const matches = (opener === '{' && char === '}') || (opener === '[' && char === ']');
        if (!matches) {
          return undefined;
        }
        i += 1;
        if (stack.length === 0) {
          return i;
        }
        continue;
      }
      i += 1;
    }
    return undefined;
  }

  let i = start;
  while (i < text.length) {
    const char = text[i];
    if (char === ',' || char === '}' || char === ']') {
      break;
    }
    i += 1;
  }
  let end = i;
  while (end > start && /\s/.test(text[end - 1])) {
    end -= 1;
  }
  return end;
}

function extractTopLevelPropertyValue(jsonText: string, propertyName: string): string | undefined {
  let i = skipWhitespace(jsonText, 0);
  if (jsonText[i] !== '{') {
    return undefined;
  }
  i += 1;

  while (i < jsonText.length) {
    i = skipWhitespace(jsonText, i);
    if (jsonText[i] === '}') {
      return undefined;
    }

    const keyToken = readJsonStringToken(jsonText, i);
    if (!keyToken) {
      return undefined;
    }
    i = skipWhitespace(jsonText, keyToken.end);
    if (jsonText[i] !== ':') {
      return undefined;
    }
    i += 1;
    i = skipWhitespace(jsonText, i);
    const valueStart = i;
    const valueEnd = readJsonValueEnd(jsonText, i);
    if (valueEnd === undefined) {
      return undefined;
    }

    if (keyToken.value === propertyName) {
      return jsonText.slice(valueStart, valueEnd);
    }

    i = skipWhitespace(jsonText, valueEnd);
    if (jsonText[i] === ',') {
      i += 1;
      continue;
    }
    if (jsonText[i] === '}') {
      return undefined;
    }
    return undefined;
  }
  return undefined;
}

async function hashBytes(bytes: Uint8Array, algorithm: HashAlgorithm): Promise<string> {
  if (algorithm === 'keccak256') {
    return keccak256(bytes);
  }
  return sha256(bytes);
}

/**
 * Kayros envelope with data and proof metadata.
 * - `fromJSON` keeps raw top-level `data` bytes for deterministic re-hashing.
 * - Metadata extraction is delegated to version-specific accessors.
 */
export class KayrosEnvelope<T = unknown> {
  public readonly data: T;
  public readonly kayros: AnyKayrosMetadata;
  private readonly metadata: MetadataAccessor;
  private readonly dataAccessor: EnvelopeDataAccessor<T>;

  constructor(data: T, kayros: AnyKayrosMetadata, options?: EnvelopeOptions) {
    this.data = data;
    this.kayros = kayros;
    this.metadata = createMetadataAccessor(kayros);
    this.dataAccessor = new EnvelopeDataAccessor(data, this.metadata.kind, options?.rawDataJson);
  }

  static fromJSON(jsonText: string): KayrosEnvelope<unknown> {
    const parsed = JSON.parse(jsonText) as { data?: unknown; kayros?: AnyKayrosMetadata };
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid proof JSON: expected object');
    }
    if (!('data' in parsed) || !('kayros' in parsed)) {
      throw new Error('Invalid proof JSON: expected { data, kayros }');
    }
    const rawDataJson = extractTopLevelPropertyValue(jsonText, 'data');
    return new KayrosEnvelope(parsed.data, parsed.kayros as AnyKayrosMetadata, { rawDataJson });
  }

  getDataHash(): string | undefined {
    return this.metadata.getDataHash();
  }

  getDataType(): string | undefined {
    return this.metadata.getDataType();
  }

  getDataTypeLabel(): string | undefined {
    return this.metadata.getDataTypeLabel();
  }

  getDataTypeLookupCandidates(): Array<string | undefined> {
    return this.metadata.getDataTypeLookupCandidates();
  }

  getKayrosHash(): string | undefined {
    return this.metadata.getKayrosHash();
  }

  getTimeUUID(): string | undefined {
    return this.metadata.getTimeUUID();
  }

  getHashAlgorithm(): string {
    return this.metadata.getHashAlgorithm();
  }

  isV0(): boolean {
    return this.metadata.kind === 'legacy_v0';
  }

  getData(): Uint8Array {
    return this.dataAccessor.getPrimaryBytes();
  }

  async computeDataHash(): Promise<string> {
    const preferred = this.metadata.getHashAlgorithm();
    const alternate: HashAlgorithm = preferred === 'keccak256' ? 'sha256' : 'keccak256';
    const expected = this.getDataHash()?.toLowerCase();
    const bytesCandidates = this.dataAccessor.getByteCandidates();

    if (expected) {
      for (const bytes of bytesCandidates) {
        const preferredHash = await hashBytes(bytes, preferred);
        if (preferredHash === expected) {
          return preferredHash;
        }
        const alternateHash = await hashBytes(bytes, alternate);
        if (alternateHash === expected) {
          return alternateHash;
        }
      }
    }

    const primaryBytes = this.dataAccessor.getPrimaryBytes();
    return hashBytes(primaryBytes, preferred);
  }
}
