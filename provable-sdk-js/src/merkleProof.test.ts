import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkMerkleProofCompatibility, getMerkleProofLevels, normalizeMerkleProof } from './merkleProof';
import type { GetRecordResponse, MerkleProofResponse } from './types';

function loadJson<T>(name: string): T {
  const file = resolve(process.cwd(), '..', 'testdata', name);
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

const record = loadJson<GetRecordResponse>('proof1_record.json');
const proofs = [1, 2, 3, 4].map(version => loadJson<MerkleProofResponse>(`proof1_merkle_${version}.json`));

describe('real merkle proof fixtures', () => {
  it('all belong to the same record', () => {
    for (const proof of proofs) {
      expect(proof.data_type).toBe(record.data_type);
      expect(proof.hash_item).toBe(record.hash_item);
      expect(proof.position).toBe(record.position);
    }
  });

  it('normalizes and materializes the real proof levels', () => {
    const normalized = normalizeMerkleProof(proofs[0]);
    expect(normalized.proof).toHaveLength(294);
    expect(normalized.level_counts).toEqual([160, 134]);
    expect(normalized.level_starts).toEqual([99840, 256]);

    const levelsV1 = getMerkleProofLevels(proofs[0]);
    expect(levelsV1).toEqual([
      {
        level: 0,
        start: 99840,
        count: 160,
        hashes: normalized.proof.slice(0, 160),
      },
      {
        level: 1,
        start: 256,
        count: 134,
        hashes: normalized.proof.slice(160),
      },
    ]);

    const levelsV4 = getMerkleProofLevels(proofs[3]);
    expect(levelsV4.map(({ level, start, count }) => ({ level, start, count }))).toEqual([
      { level: 0, start: 99840, count: 256 },
      { level: 1, start: 256, count: 256 },
      { level: 2, start: 1, count: 1 },
    ]);
  });

  it('accepts monotonic proof growth across versions', () => {
    const cases: Array<[number, number]> = [
      [0, 1],
      [1, 2],
      [2, 3],
      [0, 3],
    ];

    for (const [previousIndex, nextIndex] of cases) {
      const result = checkMerkleProofCompatibility(proofs[previousIndex], proofs[nextIndex]);
      expect(result.compatible).toBe(true);
      expect(result.checkedEntries).toBe(proofs[previousIndex].proof.length);
      expect(result.mismatches).toEqual([]);
    }
  });

  it('reports exact mismatches when comparing a newer proof against an older one', () => {
    const result = checkMerkleProofCompatibility(proofs[3], proofs[0]);

    expect(result.compatible).toBe(false);
    expect(result.checkedEntries).toBe(294);
    expect(result.mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'missing_position',
          level: 0,
          position: 100000,
          previousIndex: 160,
        }),
        expect.objectContaining({
          kind: 'missing_position',
          level: 1,
          position: 390,
          previousIndex: 134,
        }),
        expect.objectContaining({
          kind: 'missing_level',
          level: 2,
        }),
      ]),
    );
  });
});
