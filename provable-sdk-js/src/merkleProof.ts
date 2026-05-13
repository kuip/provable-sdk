import type {
  MerkleProofCompatibilityMismatch,
  MerkleProofCompatibilityResult,
  MerkleProofInput,
  MerkleProofLevel,
  NormalizedMerkleProof,
} from './types';
import { normalizeHexString, normalizeLevelCounts } from './proofShared';

export function normalizeMerkleProof(input: MerkleProofInput): NormalizedMerkleProof {
  if (isNormalizedMerkleProof(input)) {
    return {
      ...input,
      proof: [...input.proof],
      level_counts: [...input.level_counts],
      level_starts: [...input.level_starts],
    };
  }

  if (!input.success) {
    throw new Error(input.error || input.message || 'Missing merkle proof');
  }

  const hashItem = normalizeHexString(input.hash_item);
  const root = normalizeHexString(input.root) ?? '';
  if (!input.data_type || !hashItem || !Array.isArray(input.proof)) {
    throw new Error('Invalid merkle proof structure');
  }

  const proof = input.proof.map(hash => {
    const normalized = normalizeHexString(hash);
    if (!normalized) {
      throw new Error('Invalid proof hash');
    }
    return normalized;
  });

  return {
    data_type: input.data_type,
    hash_item: hashItem,
    proof,
    root,
    position: Number(input.position ?? 0),
    levels: Number(input.levels ?? 0),
    level_counts: (input.level_counts ?? []).map(value => Number(value)),
    level_starts: (input.level_starts ?? []).map(value => Number(value)),
    raw: input,
  };
}

export function getMerkleProofLevels(input: MerkleProofInput): MerkleProofLevel[] {
  const proof = normalizeMerkleProof(input);
  const levelCounts = normalizeLevelCounts(proof.level_counts, proof.levels, proof.proof.length);
  if (typeof levelCounts === 'string') {
    throw new Error(levelCounts);
  }

  let offset = 0;
  return levelCounts.map((count, level) => {
    const start = proof.level_starts[level] ?? defaultLevelStart(proof.position, level, count);
    const hashes = proof.proof.slice(offset, offset + count);
    offset += count;
    return {
      level,
      start,
      count,
      hashes,
    };
  });
}

export function checkMerkleProofCompatibility(
  previousInput: MerkleProofInput,
  nextInput: MerkleProofInput,
): MerkleProofCompatibilityResult {
  const previous = normalizeMerkleProof(previousInput);
  const next = normalizeMerkleProof(nextInput);
  const mismatches: MerkleProofCompatibilityMismatch[] = [];

  if (previous.data_type !== next.data_type) {
    mismatches.push({
      kind: 'data_type',
      message: `data_type mismatch previous=${previous.data_type} next=${next.data_type}`,
    });
  }

  if (previous.hash_item !== next.hash_item) {
    mismatches.push({
      kind: 'hash_item',
      message: `hash_item mismatch previous=${previous.hash_item} next=${next.hash_item}`,
      previousHash: previous.hash_item,
      nextHash: next.hash_item,
    });
  }

  if (previous.position !== next.position) {
    mismatches.push({
      kind: 'position',
      message: `position mismatch previous=${previous.position} next=${next.position}`,
      previousPosition: previous.position,
      nextPosition: next.position,
    });
  }

  const previousLevels = getMerkleProofLevels(previous);
  const nextLevels = getMerkleProofLevels(next);
  const nextLevelMaps = new Map<number, Map<number, { hash: string; index: number }>>();

  for (const level of nextLevels) {
    const positions = new Map<number, { hash: string; index: number }>();
    level.hashes.forEach((hash, index) => {
      positions.set(level.start + index, { hash, index });
    });
    nextLevelMaps.set(level.level, positions);
  }

  let checkedEntries = 0;
  for (const previousLevel of previousLevels) {
    const nextLevel = nextLevelMaps.get(previousLevel.level);
    if (!nextLevel) {
      mismatches.push({
        kind: 'missing_level',
        level: previousLevel.level,
        message: `missing level=${previousLevel.level} in new proof`,
      });
      continue;
    }

    previousLevel.hashes.forEach((previousHash, previousIndex) => {
      const position = previousLevel.start + previousIndex;
      const nextEntry = nextLevel.get(position);
      if (!nextEntry) {
        mismatches.push({
          kind: 'missing_position',
          level: previousLevel.level,
          position,
          previousIndex,
          message: `missing level=${previousLevel.level} position=${position} in new proof`,
          previousHash,
        });
        return;
      }

      checkedEntries += 1;
      if (nextEntry.hash !== previousHash) {
        mismatches.push({
          kind: 'hash_mismatch',
          level: previousLevel.level,
          position,
          previousIndex,
          nextIndex: nextEntry.index,
          previousHash,
          nextHash: nextEntry.hash,
          message: `hash mismatch level=${previousLevel.level} position=${position} previous=${previousHash} next=${nextEntry.hash}`,
        });
      }
    });
  }

  return {
    compatible: mismatches.length === 0,
    checkedEntries,
    previous,
    next,
    previousLevels,
    nextLevels,
    mismatches,
  };
}

function isNormalizedMerkleProof(input: MerkleProofInput): input is NormalizedMerkleProof {
  return 'raw' in input;
}

function defaultLevelStart(position: number, level: number, count: number): number {
  const levelPosition = positionAtLevel(position, level);
  if (count <= 0) {
    return levelPosition;
  }
  return Math.floor(levelPosition / count) * count;
}

function positionAtLevel(position: number, level: number): number {
  let current = position;
  for (let i = 0; i < level; i += 1) {
    current = Math.floor(current / 256);
  }
  return current;
}
