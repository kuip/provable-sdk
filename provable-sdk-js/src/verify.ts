/**
 * Kayros verification helpers.
 */

import { get_record_by_hash } from './api';
import {
  compute_hash_from_hex,
  get_merkle_proof,
  get_record_by_data_item,
  verify_hash_batch,
  verify_hash_existence,
} from './lightnet';
import type {
  BatchExistenceCheckResult,
  ComputeHashRequest,
  LevelCheckResult,
  MerkleProofResponse,
  NormalizedKayrosRecord,
  NormalizedMerkleProof,
  VerifyRequest,
  VerifyResult,
  VerifyWithInclusionRequest,
} from './types';
import type { ApiKeyOptions } from './options';

interface CanonicalVerifyRequest {
  data_type: string;
  data_item?: string;
  kayros_hash?: string;
  apiKey?: string;
}

interface VerifyCoreState {
  request: CanonicalVerifyRequest;
  apiOptions: ApiKeyOptions | undefined;
  record: NormalizedKayrosRecord;
  previousRecord?: NormalizedKayrosRecord;
  details: NonNullable<VerifyResult['details']>;
}

interface VerifyCoreOutcome {
  result: VerifyResult;
  state?: VerifyCoreState;
}

const UUID_GREGORIAN_EPOCH = 122192928000000000n;
const ZERO_HASH_32 = '00'.repeat(32);

export async function verify(input: VerifyRequest): Promise<VerifyResult> {
  const outcome = await verifyRecordCore(input);
  return outcome.result;
}

export async function verifyWithInclusion(input: VerifyWithInclusionRequest): Promise<VerifyResult> {
  const outcome = await verifyRecordCore(input);
  if (!outcome.state) {
    return outcome.result;
  }

  const { request, apiOptions, record, details } = outcome.state;
  let proof: NormalizedMerkleProof;

  try {
    const proofResponse = await get_merkle_proof(
      {
        data_type: request.data_type,
        hash: record.kayros_hash,
      },
      apiOptions
    );
    proof = normalizeProofResponse(proofResponse);
  } catch (error) {
    return invalidResult(details, `Failed to fetch merkle proof: ${errorMessage(error)}`);
  }

  details.proofFetched = true;
  details.proof = proof;
  details.proofDataTypeMatch = proof.data_type === request.data_type || utf8ToHex(proof.data_type) === utf8ToHex(request.data_type);
  details.proofHashItemMatch = proof.hash_item === record.kayros_hash;

  if (!details.proofDataTypeMatch) {
    return invalidResult(details, `Proof data_type mismatch: expected=${request.data_type} proof=${proof.data_type}`);
  }
  if (!details.proofHashItemMatch) {
    return invalidResult(details, `Proof hash_item mismatch: expected=${record.kayros_hash} proof=${proof.hash_item}`);
  }

  const levelCounts = normalizeLevelCounts(proof.level_counts, proof.levels, proof.proof.length);
  if (typeof levelCounts === 'string') {
    return invalidResult(details, levelCounts);
  }

  const inclusionMeta = proofInclusionMeta(proof, levelCounts);
  details.pending = inclusionMeta.pending;
  details.maxLevel = inclusionMeta.maxLevel;
  details.maxLevelPosition = inclusionMeta.maxLevelPosition;
  details.maxLevelHash = inclusionMeta.maxLevelHash;

  const targetPositionCheck = verifyProofTargetPosition(proof, record.kayros_hash, levelCounts);
  details.targetPositionMatch = targetPositionCheck.valid;
  if (!targetPositionCheck.valid) {
    return invalidResult(details, targetPositionCheck.error);
  }

  if (!inclusionMeta.pending) {
    const proofPathResult = await verifyProofPath(proof, levelCounts);
    details.proofPathMatch = proofPathResult.valid;
    details.localRootHash = proofPathResult.rootHash;
    if (!proofPathResult.valid) {
      return invalidResult(details, proofPathResult.error);
    }
  }

  const trustedRootHash = normalizeHexString(
    input.trusted_root_hash ?? input.trustedRootHash,
  );
  if (!inclusionMeta.pending && trustedRootHash) {
    details.trustedRootMatch = proof.root === trustedRootHash;
    if (!details.trustedRootMatch) {
      return invalidResult(details, `Root hash mismatch: proof=${proof.root} trusted=${trustedRootHash}`);
    }
  }

  const trustedLevel = input.trusted_level ?? input.trustedLevel;
  const trustedPosition = input.trusted_position ?? input.trustedPosition;
  if (Number.isInteger(trustedLevel) && Number.isInteger(trustedPosition)) {
    const expectedHash = trustedRootHash ?? getProofHashAtLevelPosition(proof, levelCounts, trustedLevel as number, trustedPosition as number);
    if (!expectedHash) {
      return invalidResult(details, `Missing proof hash at level=${trustedLevel} position=${trustedPosition}`);
    }

    try {
      const response = await verify_hash_existence(
        {
          data_type: request.data_type,
          level: trustedLevel as number,
          position: trustedPosition as number,
          hash: expectedHash,
        },
        apiOptions
      );
      details.trustedLevelMatch = response.exists && hashResponseMatches(expectedHash, response.found_hash);
      if (!details.trustedLevelMatch) {
        return invalidResult(
          details,
          response.message || `Trusted level check failed at level=${trustedLevel} position=${trustedPosition}`,
        );
      }
    } catch (error) {
      return invalidResult(details, `Trusted level check failed: ${errorMessage(error)}`);
    }
  }

  const levelChecks = input.level_checks ?? input.levelChecks ?? [];
  if (levelChecks.length > 0) {
    const checkResults: LevelCheckResult[] = [];
    for (const check of levelChecks) {
      const requestedHash = normalizeHexString(check.hash) ?? getProofHashAtLevelPosition(proof, levelCounts, check.level, check.position);
      if (!requestedHash) {
        return invalidResult(details, `Missing proof hash at level=${check.level} position=${check.position}`);
      }
      try {
        const response = await verify_hash_existence(
          {
            data_type: request.data_type,
            level: check.level,
            position: check.position,
            hash: requestedHash,
          },
          apiOptions
        );
        const valid = response.exists && hashResponseMatches(requestedHash, response.found_hash);
        checkResults.push({
          level: check.level,
          position: check.position,
          hash: requestedHash,
          valid,
          exists: response.exists,
          found_hash: normalizeHexString(response.found_hash),
          message: response.message,
        });
        if (!valid) {
          details.levelChecks = checkResults;
          return invalidResult(
            details,
            response.message || `Level check failed at level=${check.level} position=${check.position}`,
          );
        }
      } catch (error) {
        checkResults.push({
          level: check.level,
          position: check.position,
          hash: requestedHash,
          valid: false,
          message: errorMessage(error),
        });
        details.levelChecks = checkResults;
        return invalidResult(details, `Level check failed: ${errorMessage(error)}`);
      }
    }
    details.levelChecks = checkResults;
  }

  if (input.verify_batch_existence ?? input.verifyBatchExistence) {
    const batchChecks: BatchExistenceCheckResult[] = [];
    let offset = 0;
    for (let level = 0; level < levelCounts.length; level += 1) {
      const count = levelCounts[level];
      const hashes = proof.proof.slice(offset, offset + count);
      const start = proof.level_starts[level] ?? 0;
      try {
        const response = await verify_hash_batch(
          {
            data_type: request.data_type,
            level,
            start,
            hashes,
          },
          apiOptions
        );
        const valid = response.mismatches === 0 && response.results.every(result => result === 1);
        batchChecks.push({
          level,
          start,
          hashes,
          valid,
          results: response.results,
          matches: response.matches,
          mismatches: response.mismatches,
        });
        if (!valid) {
          details.batchChecks = batchChecks;
          details.batchExistenceMatch = false;
          return invalidResult(details, `Batch existence check failed at level=${level}`);
        }
      } catch (error) {
        batchChecks.push({
          level,
          start,
          hashes,
          valid: false,
          results: [],
          matches: 0,
          mismatches: hashes.length,
        });
        details.batchChecks = batchChecks;
        details.batchExistenceMatch = false;
        return invalidResult(details, `Batch existence check failed: ${errorMessage(error)}`);
      }
      offset += count;
    }
    details.batchChecks = batchChecks;
    details.batchExistenceMatch = true;
  }

  return {
    valid: true,
    details,
  };
}

async function verifyRecordCore(input: VerifyRequest): Promise<VerifyCoreOutcome> {
  const request = canonicalizeVerifyRequest(input);
  const lookupMode = request.kayros_hash ? 'kayros_hash' as const : 'data_item' as const;
  const details: NonNullable<VerifyResult['details']> = {
    lookupMode,
    recordFound: false,
  };
  const apiOptions = request.apiKey ? { apiKey: request.apiKey } : undefined;

  if (!request.data_type) {
    return { result: invalidResult(details, 'Missing data_type') };
  }
  if (!request.data_item && !request.kayros_hash) {
    return { result: invalidResult(details, 'Either data_item or kayros_hash is required') };
  }

  let record: NormalizedKayrosRecord;
  try {
    record = request.kayros_hash
      ? normalizeRecordResponse(await get_record_by_hash(request.kayros_hash, { dataType: request.data_type, ...apiOptions }) as unknown as { [key: string]: unknown })
      : await fetchRecordByDataItem(request.data_type, request.data_item!, apiOptions);
  } catch (error) {
    return {
      result: invalidResult(details, `Failed to fetch record: ${errorMessage(error)}`),
    };
  }

  details.recordFound = true;
  details.record = record;
  details.dataTypeMatch = dataTypeMatches(record, request.data_type);
  if (!details.dataTypeMatch) {
    return { result: invalidResult(details, `Record data_type mismatch: expected=${request.data_type} record=${record.data_type}`) };
  }

  if (request.data_item) {
    const normalizedDataItem = normalizeHexString(request.data_item);
    details.dataItemMatch = normalizedDataItem === record.data_item;
    if (!details.dataItemMatch) {
      return {
        result: invalidResult(
          details,
          `Record data_item mismatch: expected=${normalizedDataItem ?? request.data_item} record=${record.data_item}`,
        ),
      };
    }
  }

  if (request.kayros_hash) {
    const normalizedKayrosHash = normalizeHexString(request.kayros_hash);
    details.kayrosHashMatch = normalizedKayrosHash === record.kayros_hash;
    if (!details.kayrosHashMatch) {
      return {
        result: invalidResult(
          details,
          `Record hash mismatch: expected=${normalizedKayrosHash ?? request.kayros_hash} record=${record.kayros_hash}`,
        ),
      };
    }
  }

  let previousRecord: NormalizedKayrosRecord | undefined;
  if (record.prev_hash && !isZeroHash(record.prev_hash)) {
    try {
      previousRecord = normalizeRecordResponse(
        await get_record_by_hash(record.prev_hash, { dataType: record.data_type, ...apiOptions }) as unknown as { [key: string]: unknown },
      );
      details.previousRecord = previousRecord;
    } catch (error) {
      return { result: invalidResult(details, `Failed to fetch previous record: ${errorMessage(error)}`) };
    }
  }

  details.chainLinkMatch = previousRecord
    ? previousRecord.data_type === record.data_type && previousRecord.kayros_hash === record.prev_hash
    : true;
  if (!details.chainLinkMatch) {
    return { result: invalidResult(details, 'Previous record chain link mismatch') };
  }

  const computeRequest: ComputeHashRequest = {
    prev_hash: record.prev_hash ?? ZERO_HASH_32,
    data_type: record.data_type,
    data_item: record.data_item,
    timeuuid: record.uuid,
    hash_type: record.hash_type,
  };

  try {
    const computed = await compute_hash_from_hex(computeRequest, apiOptions);
    details.computedRecordHash = normalizeHexString(computed.hash);
  } catch (error) {
    return { result: invalidResult(details, `Failed to recompute Kayros hash: ${errorMessage(error)}`) };
  }

  details.recordHashMatch = details.computedRecordHash === record.kayros_hash;
  if (!details.recordHashMatch) {
    return {
      result: invalidResult(
        details,
        `Kayros hash mismatch: computed=${details.computedRecordHash} record=${record.kayros_hash}`,
      ),
    };
  }

  details.uuidTimestampMatch = record.timestamp !== '';
  if (!details.uuidTimestampMatch) {
    return { result: invalidResult(details, 'Invalid record UUID timestamp') };
  }

  return {
    result: {
      valid: true,
      details,
    },
    state: {
      request,
      apiOptions,
      record,
      previousRecord,
      details,
    },
  };
}

async function fetchRecordByDataItem(
  dataType: string,
  dataItem: string,
  apiOptions?: ApiKeyOptions,
): Promise<NormalizedKayrosRecord> {
  const response = await get_record_by_data_item(dataType, dataItem, apiOptions);
  if (!Array.isArray(response.records) || response.records.length === 0) {
    throw new Error('Record not found');
  }
  if (response.records.length > 1) {
    throw new Error(`Multiple records found for data_item; provide kayros_hash (count=${response.records.length})`);
  }
  return normalizeRecordResponse(response.records[0] as unknown as { [key: string]: unknown });
}

function canonicalizeVerifyRequest(input: VerifyRequest): CanonicalVerifyRequest {
  return {
    data_type: input.data_type ?? input.dataType ?? '',
    data_item: input.data_item ?? input.dataItem,
    kayros_hash: input.kayros_hash ?? input.kayrosHash,
    apiKey: input.apiKey ?? input.api_key ?? input.userKey,
  };
}

function normalizeRecordResponse(raw: { [key: string]: unknown }): NormalizedKayrosRecord {
  const dataType = typeof raw.data_type === 'string' ? raw.data_type : '';
  const dataItem = normalizeHexString(typeof raw.data_item === 'string' ? raw.data_item : undefined)
    ?? normalizeHexString(typeof raw.data_item_hex === 'string' ? raw.data_item_hex : undefined);
  const kayrosHash = normalizeHexString(typeof raw.hash_item === 'string' ? raw.hash_item : undefined)
    ?? normalizeHexString(typeof raw.hash_item_hex === 'string' ? raw.hash_item_hex : undefined);
  const prevHash = normalizeHexString(typeof raw.prev_hash === 'string' ? raw.prev_hash : undefined)
    ?? normalizeHexString(typeof raw.prev_hash_hex === 'string' ? raw.prev_hash_hex : undefined);
  const hashType = typeof raw.hash_type === 'string' ? raw.hash_type : '';
  const position = typeof raw.position === 'number' ? raw.position : Number(raw.position ?? 0);
  const tsValue = typeof raw.ts === 'string'
    ? raw.ts
    : typeof raw.uuid_hex === 'string'
      ? raw.uuid_hex
      : '';
  const uuid = uuidStringToHex(tsValue);
  const timestamp = uuid ? timeuuidHexToTimestamp(uuid) : '';

  if (!dataType || !dataItem || !kayrosHash || !hashType || !uuid || !timestamp) {
    throw new Error('Invalid remote record structure');
  }

  return {
    data_type: dataType,
    data_type_hex: utf8ToHex(dataType),
    data_item: dataItem,
    kayros_hash: kayrosHash,
    prev_hash: prevHash,
    hash_type: hashType,
    uuid,
    timestamp,
    position,
    raw: raw as unknown as NormalizedKayrosRecord['raw'],
  };
}

function normalizeProofResponse(raw: MerkleProofResponse): NormalizedMerkleProof {
  if (!raw.success) {
    throw new Error(raw.error || raw.message || 'Missing merkle proof');
  }

  const hashItem = normalizeHexString(raw.hash_item);
  const root = normalizeHexString(raw.root);
  if (!raw.data_type || !hashItem || !root || !Array.isArray(raw.proof)) {
    throw new Error('Invalid merkle proof structure');
  }

  const proof = raw.proof.map(hash => {
    const normalized = normalizeHexString(hash);
    if (!normalized) {
      throw new Error('Invalid proof hash');
    }
    return normalized;
  });

  return {
    data_type: raw.data_type,
    hash_item: hashItem,
    proof,
    root,
    position: Number(raw.position ?? 0),
    levels: Number(raw.levels ?? 0),
    level_counts: (raw.level_counts ?? []).map(value => Number(value)),
    level_starts: (raw.level_starts ?? []).map(value => Number(value)),
    raw,
  };
}

function normalizeLevelCounts(counts: number[], levels: number, proofLen: number): number[] | string {
  if (proofLen <= 0) {
    return 'empty proof path';
  }
  if (counts.length > 0) {
    const total = counts.reduce((sum, count) => sum + count, 0);
    if (counts.some(count => count <= 0)) {
      return 'invalid level count';
    }
    if (total !== proofLen) {
      return 'proof length mismatch';
    }
    return counts;
  }
  if (levels <= 0 || levels === 1) {
    return [proofLen];
  }
  const remaining = proofLen - (256 * (levels - 1));
  if (remaining <= 0) {
    return 'proof length mismatch';
  }
  return [...Array.from({ length: levels - 1 }, () => 256), remaining];
}

async function verifyProofPath(
  proof: NormalizedMerkleProof,
  levelCounts: number[],
): Promise<{ valid: true; rootHash: string } | { valid: false; error: string; rootHash?: string }> {
  let offset = 0;
  let previousRollup = '';
  let lastRollup = '';
  let currentPosition = proof.position;

  for (let level = 0; level < levelCounts.length; level += 1) {
    const count = levelCounts[level];
    if (count <= 0) {
      return { valid: false, error: 'invalid level count' };
    }
    if (offset + count > proof.proof.length) {
      return { valid: false, error: 'proof length mismatch' };
    }

    const levelHashes = proof.proof.slice(offset, offset + count);
    if (previousRollup) {
      const index = levelIndexForPosition(level, currentPosition, count, proof.level_starts);
      if (typeof index === 'string') {
        return { valid: false, error: index };
      }
      if (levelHashes[index] !== previousRollup) {
        return {
          valid: false,
          error: `level hash mismatch level=${level} index=${index} expected=${previousRollup} got=${levelHashes[index]}`,
        };
      }
    }

    const isLastLevel = level === levelCounts.length - 1;
    if (isLastLevel && count === 1) {
      lastRollup = levelHashes[0];
    } else {
      previousRollup = await sha256HexConcat(levelHashes);
      if (isLastLevel) {
        lastRollup = previousRollup;
      }
    }

    offset += count;
    currentPosition = Math.floor(currentPosition / 256);
  }

  if (!lastRollup) {
    return { valid: false, error: 'missing final hash' };
  }
  if (lastRollup !== proof.root) {
    return {
      valid: false,
      error: `root hash mismatch computed=${lastRollup} root=${proof.root}`,
      rootHash: lastRollup,
    };
  }
  return { valid: true, rootHash: lastRollup };
}

function verifyProofTargetPosition(
  proof: NormalizedMerkleProof,
  targetHash: string,
  levelCounts: number[],
): { valid: true } | { valid: false; error: string } {
  if (levelCounts.length === 0 || levelCounts[0] <= 0) {
    return { valid: false, error: 'invalid level count' };
  }
  const index = levelIndexForPosition(0, proof.position, levelCounts[0], proof.level_starts);
  if (typeof index === 'string') {
    return { valid: false, error: index };
  }
  if (proof.proof[index] !== targetHash) {
    return {
      valid: false,
      error: `target hash not found at expected position index=${index} expected=${targetHash} got=${proof.proof[index]}`,
    };
  }
  return { valid: true };
}

function proofInclusionMeta(
  proof: NormalizedMerkleProof,
  levelCounts: number[],
): { pending: boolean; maxLevel: number; maxLevelPosition: number; maxLevelHash: string } {
  if (proof.level_counts.length === 0 || levelCounts.length === 0) {
    return { pending: true, maxLevel: -1, maxLevelPosition: -1, maxLevelHash: '' };
  }

  const positions = [proof.position];
  let currentPosition = proof.position;
  for (let i = 0; i < levelCounts.length - 1; i += 1) {
    currentPosition = Math.floor(currentPosition / 256);
    positions.push(currentPosition);
  }

  const maxLevel = levelCounts.length - 1;
  const maxLevelPosition = positions[maxLevel] ?? -1;
  let maxLevelHash = proof.root;
  if (!maxLevelHash) {
    const levelHashes = proofLevelHashes(proof.proof, levelCounts, maxLevel);
    const levelStart = proof.level_starts[maxLevel] ?? 0;
    const index = maxLevelPosition - levelStart;
    if (index >= 0 && index < levelHashes.length) {
      maxLevelHash = levelHashes[index];
    }
  }

  let pending = false;
  if (levelCounts.length < 2) {
    pending = true;
  } else {
    const levelStart = proof.level_starts[1] ?? 0;
    const levelIndex = positions[1] - levelStart;
    pending = levelIndex < 0 || levelIndex >= levelCounts[1];
  }

  return {
    pending,
    maxLevel,
    maxLevelPosition,
    maxLevelHash,
  };
}

function proofLevelHashes(allHashes: string[], levelCounts: number[], level: number): string[] {
  if (level < 0 || level >= levelCounts.length) {
    return [];
  }
  const offset = levelCounts.slice(0, level).reduce((sum, count) => sum + count, 0);
  const count = levelCounts[level];
  return allHashes.slice(offset, offset + count);
}

function getProofHashAtLevelPosition(
  proof: NormalizedMerkleProof,
  levelCounts: number[],
  level: number,
  position: number,
): string | undefined {
  const hashes = proofLevelHashes(proof.proof, levelCounts, level);
  if (hashes.length === 0) {
    return undefined;
  }
  const index = levelIndexForPosition(level, position, hashes.length, proof.level_starts);
  if (typeof index === 'string') {
    return undefined;
  }
  return hashes[index];
}

function levelIndexForPosition(
  level: number,
  currentPosition: number,
  count: number,
  levelStarts: number[],
): number | string {
  if (count <= 0) {
    return 'invalid level count';
  }
  const start = levelStarts[level] ?? Math.floor(currentPosition / count) * count;
  const index = currentPosition - start;
  if (index < 0 || index >= count) {
    return 'proof index out of range';
  }
  return index;
}

async function sha256HexConcat(hashes: string[]): Promise<string> {
  const payload = new Uint8Array(hashes.reduce((sum, hash) => sum + hash.length / 2, 0));
  let offset = 0;
  for (const hash of hashes) {
    const bytes = hexToBytes(hash);
    payload.set(bytes, offset);
    offset += bytes.length;
  }
  const digest = await crypto.subtle.digest('SHA-256', payload);
  return bytesToHex(new Uint8Array(digest));
}

function hashResponseMatches(expectedHash: string, foundHash?: string): boolean {
  const normalizedFoundHash = normalizeHexString(foundHash);
  return !normalizedFoundHash || normalizedFoundHash === expectedHash;
}

function dataTypeMatches(record: NormalizedKayrosRecord, expected: string): boolean {
  return record.data_type === expected || record.data_type_hex === utf8ToHex(expected);
}

function normalizeHexString(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const bytes = decodeFlexibleBytes(value);
  return bytes ? bytesToHex(bytes) : undefined;
}

function decodeFlexibleBytes(value: string): Uint8Array | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const hexCandidate = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  if (hexCandidate.length > 0 && hexCandidate.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(hexCandidate)) {
    return hexToBytes(hexCandidate);
  }

  const base64Bytes = decodeBase64(trimmed);
  if (base64Bytes) {
    return base64Bytes;
  }

  return undefined;
}

function decodeBase64(value: string): Uint8Array | undefined {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  try {
    const decoded = atob(normalized + padding);
    const bytes = new Uint8Array(decoded.length);
    for (let index = 0; index < decoded.length; index += 1) {
      bytes[index] = decoded.charCodeAt(index);
    }
    return bytes;
  } catch {
    return undefined;
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value: string): Uint8Array {
  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }
  return bytes;
}

function utf8ToHex(value: string): string {
  return bytesToHex(new TextEncoder().encode(value));
}

function uuidStringToHex(value: string): string {
  const normalized = value.trim().replace(/-/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(normalized)) {
    return '';
  }
  return normalized;
}

function timeuuidHexToTimestamp(uuidHex: string): string {
  const bytes = hexToBytes(uuidHex);
  if (bytes.length !== 16) {
    return '';
  }

  const timeLow = (BigInt(bytes[0]) << 24n)
    | (BigInt(bytes[1]) << 16n)
    | (BigInt(bytes[2]) << 8n)
    | BigInt(bytes[3]);
  const timeMid = (BigInt(bytes[4]) << 8n) | BigInt(bytes[5]);
  const timeHi = ((BigInt(bytes[6]) << 8n) | BigInt(bytes[7])) & 0x0fffn;
  const timestamp = timeLow | (timeMid << 32n) | (timeHi << 48n);
  const unixNanos = (timestamp - UUID_GREGORIAN_EPOCH) * 100n;
  const unixMillis = Number(unixNanos / 1_000_000n);

  if (!Number.isFinite(unixMillis)) {
    return '';
  }

  return new Date(unixMillis).toISOString();
}

function isZeroHash(value: string): boolean {
  return /^[0]+$/.test(value);
}

function invalidResult(details: NonNullable<VerifyResult['details']>, error: string): VerifyResult {
  return {
    valid: false,
    error,
    details,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
