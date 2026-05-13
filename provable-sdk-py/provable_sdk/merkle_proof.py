from __future__ import annotations

from typing import Any, Dict, List

from .types import (
    MerkleProofCompatibilityMismatch,
    MerkleProofCompatibilityResult,
    MerkleProofInput,
    MerkleProofLevel,
    NormalizedMerkleProof,
)
from .verify import _normalize_level_counts, _normalize_proof


def normalize_merkle_proof(proof: MerkleProofInput) -> NormalizedMerkleProof:
    if "raw" in proof and "proof" in proof and "data_type" in proof and "hash_item" in proof:
        normalized = dict(proof)
        normalized["proof"] = list(proof.get("proof", []))
        normalized["level_counts"] = [int(value) for value in proof.get("level_counts", [])]
        normalized["level_starts"] = [int(value) for value in proof.get("level_starts", [])]
        return normalized  # type: ignore[return-value]
    return _normalize_proof(proof)  # type: ignore[arg-type]


def get_merkle_proof_levels(proof: MerkleProofInput) -> List[MerkleProofLevel]:
    normalized = normalize_merkle_proof(proof)
    level_counts = _normalize_level_counts(
        normalized.get("level_counts", []),
        int(normalized.get("levels", 0)),
        len(normalized.get("proof", [])),
    )
    if isinstance(level_counts, str):
        raise ValueError(level_counts)

    levels: List[MerkleProofLevel] = []
    offset = 0
    for level, count in enumerate(level_counts):
        start = (
            normalized["level_starts"][level]
            if level < len(normalized.get("level_starts", []))
            else _default_level_start(int(normalized["position"]), level, count)
        )
        hashes = normalized["proof"][offset:offset + count]
        levels.append({
            "level": level,
            "start": start,
            "count": count,
            "hashes": hashes,
        })
        offset += count
    return levels


def check_merkle_proof_compatibility(
    previous_proof: MerkleProofInput,
    next_proof: MerkleProofInput,
) -> MerkleProofCompatibilityResult:
    previous = normalize_merkle_proof(previous_proof)
    current = normalize_merkle_proof(next_proof)
    mismatches: List[MerkleProofCompatibilityMismatch] = []

    if previous["data_type"] != current["data_type"]:
        mismatches.append({
            "kind": "data_type",
            "message": f"data_type mismatch previous={previous['data_type']} next={current['data_type']}",
        })

    if previous["hash_item"] != current["hash_item"]:
        mismatches.append({
            "kind": "hash_item",
            "message": f"hash_item mismatch previous={previous['hash_item']} next={current['hash_item']}",
            "previousHash": previous["hash_item"],
            "nextHash": current["hash_item"],
        })

    if int(previous["position"]) != int(current["position"]):
        mismatches.append({
            "kind": "position",
            "message": f"position mismatch previous={previous['position']} next={current['position']}",
            "previousPosition": int(previous["position"]),
            "nextPosition": int(current["position"]),
        })

    previous_levels = get_merkle_proof_levels(previous)
    current_levels = get_merkle_proof_levels(current)
    current_level_maps: Dict[int, Dict[int, Dict[str, Any]]] = {}

    for level in current_levels:
        current_level_maps[level["level"]] = {
            level["start"] + index: {"hash": hash_value, "index": index}
            for index, hash_value in enumerate(level["hashes"])
        }

    checked_entries = 0
    for previous_level in previous_levels:
        current_level = current_level_maps.get(previous_level["level"])
        if current_level is None:
            mismatches.append({
                "kind": "missing_level",
                "level": previous_level["level"],
                "message": f"missing level={previous_level['level']} in new proof",
            })
            continue

        for previous_index, previous_hash in enumerate(previous_level["hashes"]):
            position = previous_level["start"] + previous_index
            current_entry = current_level.get(position)
            if current_entry is None:
                mismatches.append({
                    "kind": "missing_position",
                    "level": previous_level["level"],
                    "position": position,
                    "previousIndex": previous_index,
                    "previousHash": previous_hash,
                    "message": f"missing level={previous_level['level']} position={position} in new proof",
                })
                continue

            checked_entries += 1
            if current_entry["hash"] != previous_hash:
                mismatches.append({
                    "kind": "hash_mismatch",
                    "level": previous_level["level"],
                    "position": position,
                    "previousIndex": previous_index,
                    "nextIndex": int(current_entry["index"]),
                    "previousHash": previous_hash,
                    "nextHash": str(current_entry["hash"]),
                    "message": (
                        f"hash mismatch level={previous_level['level']} position={position} "
                        f"previous={previous_hash} next={current_entry['hash']}"
                    ),
                })

    return {
        "compatible": len(mismatches) == 0,
        "checkedEntries": checked_entries,
        "previous": previous,
        "next": current,
        "previousLevels": previous_levels,
        "nextLevels": current_levels,
        "mismatches": mismatches,
    }


def _default_level_start(position: int, level: int, count: int) -> int:
    level_position = _position_at_level(position, level)
    if count <= 0:
        return level_position
    return (level_position // count) * count


def _position_at_level(position: int, level: int) -> int:
    current = position
    for _ in range(level):
        current //= 256
    return current


normalizeMerkleProof = normalize_merkle_proof
getMerkleProofLevels = get_merkle_proof_levels
checkMerkleProofCompatibility = check_merkle_proof_compatibility
