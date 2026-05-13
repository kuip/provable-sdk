/**
 * Kayros verification helpers.
 */

import { sha3_256 as sha3_256Impl } from 'js-sha3';

import { get_record_by_hash } from './api';
import { normalizeMerkleProof } from './merkleProof';
import { bytesToHex, hexToBytes, normalizeHexString, normalizeLevelCounts } from './proofShared';
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
  NormalizedKayrosRecord,
  NormalizedMerkleProof,
  VerifyMerkleProofWithDetailsRequest,
  VerifyMerkleProofWithDetailsResult,
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
const DEFAULT_LEVELS_HASH_TYPE = 'sha3-256';

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
  const levelsHashType = normalizeLevelsHashType(input.levels_hash_type ?? input.levelsHashType);
  if (typeof levelsHashType !== 'string') {
    return invalidResult(details, levelsHashType.error);
  }
  details.levelsHashType = levelsHashType;
  let proof: NormalizedMerkleProof;

  try {
    const proofResponse = await get_merkle_proof(
      {
        data_type: request.data_type,
        hash: record.kayros_hash,
      },
      apiOptions
    );
    proof = normalizeMerkleProof(proofResponse);
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
    const proofPathResult = await verifyProofPath(proof, levelCounts, levelsHashType);
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

export async function verifyMerkleProof(input: VerifyMerkleProofWithDetailsRequest): Promise<VerifyMerkleProofWithDetailsResult> {
  const levelsHashType = normalizeLevelsHashType(input.levels_hash_type ?? input.levelsHashType);
  if (typeof levelsHashType !== 'string') {
    return invalidMerkleProofResult(levelsHashType.error);
  }

  let proof: NormalizedMerkleProof;
  try {
    proof = normalizeMerkleProof(input.proof);
  } catch (error) {
    return invalidMerkleProofResult(errorMessage(error), {
      levelsHashType,
    });
  }

  const levelCounts = normalizeLevelCounts(proof.level_counts, proof.levels, proof.proof.length);
  if (typeof levelCounts === 'string') {
    return invalidMerkleProofResult(levelCounts, {
      levelsHashType,
      proof,
    });
  }

  const positionPath = buildPositionPath(proof.position, levelCounts.length);
  const inclusionMeta = proofInclusionMeta(proof, levelCounts);

  if (inclusionMeta.pending) {
    return {
      valid: false,
      pending: true,
      status: 'pending',
      message: pendingMerkleProofMessage(proof, levelCounts, positionPath),
      details: pendingMerkleProofDetails(proof, levelCounts),
      positionPath,
      levelsHashType,
      maxLevel: inclusionMeta.maxLevel,
      maxLevelPosition: inclusionMeta.maxLevelPosition,
      maxLevelHash: inclusionMeta.maxLevelHash,
      proof,
    };
  }

  const details: string[] = [];
  let offset = 0;
  let computedRoot = '';

  for (let level = 0; level < levelCounts.length - 1; level += 1) {
    const count = levelCounts[level];
    const levelHashes = proof.proof.slice(offset, offset + count);
    const levelStart = proof.level_starts[level] ?? 0;
    const nextLevelHashes = proofLevelHashes(proof.proof, levelCounts, level + 1);
    const nextLevelStart = proof.level_starts[level + 1] ?? 0;
    const nextLevelPosition = positionPath[level + 1];
    const nextLevelIndex = nextLevelPosition - nextLevelStart;
    const computedRollup = await hashHexConcat(levelHashes, levelsHashType);
    const expectedHash = nextLevelHashes[nextLevelIndex];
    const label = `${displayLevelsHashType(levelsHashType)}`;

    if (expectedHash === undefined) {
      details.push(
        `L${level}[${levelStart}..${levelStart + count - 1}] -> ${label} -> L${level + 1}[pos ${nextLevelPosition}, idx ${nextLevelIndex}]: pending`,
      );
      return {
        valid: true,
        pending: false,
        status: 'valid',
        message: `Proof verified for existing levels (${level + 1} levels). Higher-level rollup pending.`,
        details: [...details, ...higherLevelPendingDetails(level + 1, nextLevelPosition, nextLevelIndex)],
        positionPath,
        levelsHashType,
        computedRoot: computedRollup,
        maxLevel: inclusionMeta.maxLevel,
        maxLevelPosition: inclusionMeta.maxLevelPosition,
        maxLevelHash: inclusionMeta.maxLevelHash,
        proof,
      };
    }

    const matches = computedRollup === expectedHash;
    details.push(
      `L${level}[${levelStart}..${levelStart + count - 1}] -> ${label} -> L${level + 1}[pos ${nextLevelPosition}, idx ${nextLevelIndex}]: ${matches ? '✓' : '✗'}`,
    );

    if (!matches) {
      return {
        valid: false,
        pending: false,
        status: 'invalid',
        message: `Level ${level} rollup mismatch at level ${level + 1} position ${nextLevelPosition}.`,
        error: `Computed ${computedRollup} but expected ${expectedHash}`,
        details,
        positionPath,
        levelsHashType,
        computedRoot: computedRollup,
        maxLevel: inclusionMeta.maxLevel,
        maxLevelPosition: inclusionMeta.maxLevelPosition,
        maxLevelHash: inclusionMeta.maxLevelHash,
        proof,
      };
    }

    offset += count;
    computedRoot = computedRollup;
  }

  const finalLevel = levelCounts.length - 1;
  const finalLevelHashes = proofLevelHashes(proof.proof, levelCounts, finalLevel);
  const finalLevelStart = proof.level_starts[finalLevel] ?? 0;
  if (finalLevelHashes.length === 0) {
    return invalidMerkleProofResult('Missing final proof level', {
      levelsHashType,
      proof,
      positionPath,
      maxLevel: inclusionMeta.maxLevel,
      maxLevelPosition: inclusionMeta.maxLevelPosition,
      maxLevelHash: inclusionMeta.maxLevelHash,
    });
  }

  if (finalLevelHashes.length === 1) {
    computedRoot = finalLevelHashes[0];
  } else {
    computedRoot = await hashHexConcat(finalLevelHashes, levelsHashType);
  }

  if (!proof.root) {
    details.push('Root pending: final rollup not yet recorded in proof.root.');
    return {
      valid: true,
      pending: false,
      status: 'valid',
      message: `Proof verified for existing levels (${levelCounts.length} levels). Root pending.`,
      details,
      positionPath,
      levelsHashType,
      computedRoot,
      maxLevel: inclusionMeta.maxLevel,
      maxLevelPosition: inclusionMeta.maxLevelPosition,
      maxLevelHash: inclusionMeta.maxLevelHash,
      proof,
    };
  }

  const rootMatches = computedRoot === proof.root;
  details.push(`Root: ${rootMatches ? '✓' : '✗'} (${proof.root.slice(0, 16)}...)`);
  if (!rootMatches) {
    return {
      valid: false,
      pending: false,
      status: 'invalid',
      message: 'Root hash mismatch.',
      error: `Expected ${proof.root} but computed ${computedRoot}`,
      details,
      positionPath,
      levelsHashType,
      computedRoot,
      maxLevel: inclusionMeta.maxLevel,
      maxLevelPosition: inclusionMeta.maxLevelPosition,
      maxLevelHash: inclusionMeta.maxLevelHash,
      proof,
    };
  }

  return {
    valid: true,
    pending: false,
    status: 'valid',
    message: `Proof verified! ${levelCounts.length} levels, ${proof.proof.length} hashes.`,
    details,
    positionPath,
    levelsHashType,
    computedRoot,
    maxLevel: inclusionMeta.maxLevel,
    maxLevelPosition: inclusionMeta.maxLevelPosition,
    maxLevelHash: inclusionMeta.maxLevelHash,
    proof,
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

async function verifyProofPath(
  proof: NormalizedMerkleProof,
  levelCounts: number[],
  levelsHashType: string,
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
      previousRollup = await hashHexConcat(levelHashes, levelsHashType);
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
  if (proof.root && lastRollup !== proof.root) {
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

function buildPositionPath(position: number, levels: number): number[] {
  if (levels <= 0) {
    return [];
  }

  const path = [position];
  let currentPosition = position;
  for (let level = 1; level < levels; level += 1) {
    currentPosition = Math.floor(currentPosition / 256);
    path.push(currentPosition);
  }
  return path;
}

function pendingMerkleProofMessage(
  proof: NormalizedMerkleProof,
  levelCounts: number[],
  positionPath: number[],
): string {
  const level0Count = levelCounts[0] ?? 0;
  const level1Position = positionPath[1];
  const level1Start = proof.level_starts[1] ?? 0;
  const level1Index = typeof level1Position === 'number' ? level1Position - level1Start : -1;

  if (levelCounts.length < 2) {
    return `Proof pending: L0 group has ${level0Count} hashes and no L1 rollup yet.`;
  }

  return `Proof pending: L1[pos ${level1Position}, idx ${level1Index}] has not been generated yet.`;
}

function pendingMerkleProofDetails(proof: NormalizedMerkleProof, levelCounts: number[]): string[] {
  const details: string[] = [];
  const level0Start = proof.level_starts[0] ?? 0;
  const level0Count = levelCounts[0] ?? 0;

  if (level0Count > 0) {
    details.push(`L0[${level0Start}..${level0Start + level0Count - 1}] partial group`);
  }

  const missing = levelCounts.map(count => Math.max(0, 256 - count));
  const missingL0 = missing[0] ?? 0;
  if (missingL0 > 0) {
    details.push(`Need ${missingL0.toLocaleString()} more L0 records to complete current L0 group.`);
  }

  const last = levelCounts.length - 1;
  const missingLast = missing[last] ?? 0;
  if (last > 0 && missingLast > 0) {
    let needed = missingL0;
    for (let level = 1; level <= last; level += 1) {
      const miss = missing[level] ?? 0;
      if (miss > 0) {
        needed += Math.max(0, miss - 1) * Math.pow(256, level);
      }
    }
    if (needed > 0) {
      details.push(`~${needed.toLocaleString()} more L0 records to complete L${last} group (to get next-level rollup).`);
    }
  }

  return details;
}

function higherLevelPendingDetails(level: number, position: number, index: number): string[] {
  return [
    `Higher-level rollup pending at L${level}[pos ${position}, idx ${index}].`,
  ];
}

function invalidMerkleProofResult(
  message: string,
  overrides: Partial<Omit<VerifyMerkleProofWithDetailsResult, 'valid' | 'pending' | 'status' | 'message' | 'details'>> = {},
): VerifyMerkleProofWithDetailsResult {
  return {
    valid: false,
    pending: false,
    status: 'invalid',
    message,
    error: message,
    details: [],
    positionPath: overrides.positionPath ?? [],
    levelsHashType: overrides.levelsHashType ?? DEFAULT_LEVELS_HASH_TYPE,
    maxLevel: overrides.maxLevel ?? -1,
    maxLevelPosition: overrides.maxLevelPosition ?? -1,
    maxLevelHash: overrides.maxLevelHash ?? '',
    proof: overrides.proof,
    computedRoot: overrides.computedRoot,
  };
}

function displayLevelsHashType(levelsHashType: string): string {
  switch (levelsHashType) {
    case 'sha256':
      return 'SHA-256';
    case 'sha3-256':
      return 'SHA3-256';
    default:
      return levelsHashType;
  }
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

function normalizeLevelsHashType(input?: string): string | { error: string } {
  if (!input) {
    return DEFAULT_LEVELS_HASH_TYPE;
  }

  const normalized = input.trim().toLowerCase().replace(/_/g, '-');
  switch (normalized) {
    case 'sha3':
    case 'sha3-256':
      return 'sha3-256';
    case 'sha-256':
    case 'sha256':
      return 'sha256';
    default:
      return {
        error: `Unsupported levels_hash_type: ${input}`,
      };
  }
}

async function hashHexConcat(hashes: string[], levelsHashType: string): Promise<string> {
  const payload = new Uint8Array(hashes.reduce((sum, hash) => sum + hash.length / 2, 0));
  let offset = 0;
  for (const hash of hashes) {
    const bytes = hexToBytes(hash);
    payload.set(bytes, offset);
    offset += bytes.length;
  }

  switch (levelsHashType) {
    case 'sha256': {
      const digest = await crypto.subtle.digest('SHA-256', payload);
      return bytesToHex(new Uint8Array(digest));
    }
    case 'sha3-256':
      return sha3_256Impl(payload);
    default:
      throw new Error(`Unsupported levels_hash_type: ${levelsHashType}`);
  }
}

function hashResponseMatches(expectedHash: string, foundHash?: string): boolean {
  const normalizedFoundHash = normalizeHexString(foundHash);
  return !normalizedFoundHash || normalizedFoundHash === expectedHash;
}

function dataTypeMatches(record: NormalizedKayrosRecord, expected: string): boolean {
  return record.data_type === expected || record.data_type_hex === utf8ToHex(expected);
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
