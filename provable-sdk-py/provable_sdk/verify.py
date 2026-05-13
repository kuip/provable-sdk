"""
Kayros verification helpers.
"""

from __future__ import annotations

import base64
import datetime as dt
import hashlib
from typing import Any, Dict, List, Optional, Tuple

from .api import get_record_by_hash
from .lightnet import (
    compute_hash_from_hex,
    get_merkle_proof,
    get_record_by_data_item,
    verify_hash_batch,
    verify_hash_existence,
)
from .types import (
    VerifyMerkleProofWithDetailsRequest,
    VerifyMerkleProofWithDetailsResult,
    VerifyRequest,
    VerifyResult,
    VerifyWithInclusionRequest,
)

UUID_GREGORIAN_EPOCH = 122192928000000000
ZERO_HASH_32 = "00" * 32
DEFAULT_LEVELS_HASH_TYPE = "sha3-256"


def verify(request: VerifyRequest) -> VerifyResult:
    outcome = _verify_record_core(request)
    return outcome["result"]


def verify_with_inclusion(request: VerifyWithInclusionRequest) -> VerifyResult:
    outcome = _verify_record_core(request)
    if "state" not in outcome:
        return outcome["result"]

    state = outcome["state"]
    details = state["details"]
    api_key = state["api_key"]
    record = state["record"]
    levels_hash_type = _normalize_levels_hash_type(request.get("levels_hash_type"))
    if isinstance(levels_hash_type, dict):
        return _invalid_result(details, levels_hash_type["error"])
    details["levelsHashType"] = levels_hash_type

    try:
        proof = _normalize_proof(
            get_merkle_proof(
                record["data_type"],
                hash=record["kayros_hash"],
                api_key=api_key,
            )
        )
    except Exception as exc:
        return _invalid_result(details, f"Failed to fetch merkle proof: {exc}")

    details["proofFetched"] = True
    details["proof"] = proof
    details["proofDataTypeMatch"] = (
        proof["data_type"] == state["request"]["data_type"]
        or _utf8_hex(proof["data_type"]) == _utf8_hex(state["request"]["data_type"])
    )
    details["proofHashItemMatch"] = proof["hash_item"] == record["kayros_hash"]

    if not details["proofDataTypeMatch"]:
        return _invalid_result(
            details,
            f"Proof data_type mismatch: expected={state['request']['data_type']} proof={proof['data_type']}",
        )
    if not details["proofHashItemMatch"]:
        return _invalid_result(
            details,
            f"Proof hash_item mismatch: expected={record['kayros_hash']} proof={proof['hash_item']}",
        )

    level_counts = _normalize_level_counts(
        proof.get("level_counts", []),
        proof.get("levels", 0),
        len(proof.get("proof", [])),
    )
    if isinstance(level_counts, str):
        return _invalid_result(details, level_counts)

    pending, max_level, max_level_position, max_level_hash = _proof_inclusion_meta(proof, level_counts)
    details["pending"] = pending
    details["maxLevel"] = max_level
    details["maxLevelPosition"] = max_level_position
    details["maxLevelHash"] = max_level_hash

    ok, error = _verify_proof_target_position(proof, record["kayros_hash"], level_counts)
    details["targetPositionMatch"] = ok
    if not ok:
        return _invalid_result(details, error)

    if not pending:
        ok, error, root_hash = _verify_proof_path(proof, level_counts, levels_hash_type)
        details["proofPathMatch"] = ok
        details["localRootHash"] = root_hash
        if not ok:
            return _invalid_result(details, error)

    trusted_root_hash = _normalize_hex(request.get("trusted_root_hash"))
    if not pending and trusted_root_hash:
        details["trustedRootMatch"] = proof["root"] == trusted_root_hash
        if not details["trustedRootMatch"]:
            return _invalid_result(details, f"Root hash mismatch: proof={proof['root']} trusted={trusted_root_hash}")

    trusted_level = request.get("trusted_level")
    trusted_position = request.get("trusted_position")
    if isinstance(trusted_level, int) and isinstance(trusted_position, int):
        expected_hash = trusted_root_hash or _proof_hash_at_level_position(proof, level_counts, trusted_level, trusted_position)
        if not expected_hash:
            return _invalid_result(details, f"Missing proof hash at level={trusted_level} position={trusted_position}")
        try:
            response = verify_hash_existence(
                {
                    "data_type": state["request"]["data_type"],
                    "level": trusted_level,
                    "position": trusted_position,
                    "hash": expected_hash,
                },
                api_key=api_key,
            )
            details["trustedLevelMatch"] = bool(response.get("exists")) and _hash_response_matches(
                expected_hash,
                response.get("found_hash"),
            )
            if not details["trustedLevelMatch"]:
                return _invalid_result(
                    details,
                    response.get("message") or f"Trusted level check failed at level={trusted_level} position={trusted_position}",
                )
        except Exception as exc:
            return _invalid_result(details, f"Trusted level check failed: {exc}")

    level_checks = request.get("level_checks", [])
    if level_checks:
        check_results: List[Dict[str, Any]] = []
        for check in level_checks:
            expected_hash = _normalize_hex(check.get("hash")) or _proof_hash_at_level_position(
                proof,
                level_counts,
                check["level"],
                check["position"],
            )
            if not expected_hash:
                return _invalid_result(
                    details,
                    f"Missing proof hash at level={check['level']} position={check['position']}",
                )
            try:
                response = verify_hash_existence(
                    {
                        "data_type": state["request"]["data_type"],
                        "level": check["level"],
                        "position": check["position"],
                        "hash": expected_hash,
                    },
                    api_key=api_key,
                )
                valid = bool(response.get("exists")) and _hash_response_matches(expected_hash, response.get("found_hash"))
                check_results.append(
                    {
                        "level": check["level"],
                        "position": check["position"],
                        "hash": expected_hash,
                        "valid": valid,
                        "exists": response.get("exists"),
                        "found_hash": _normalize_hex(response.get("found_hash")),
                        "message": response.get("message"),
                    }
                )
                if not valid:
                    details["levelChecks"] = check_results
                    return _invalid_result(
                        details,
                        response.get("message") or f"Level check failed at level={check['level']} position={check['position']}",
                    )
            except Exception as exc:
                check_results.append(
                    {
                        "level": check["level"],
                        "position": check["position"],
                        "hash": expected_hash,
                        "valid": False,
                        "message": str(exc),
                    }
                )
                details["levelChecks"] = check_results
                return _invalid_result(details, f"Level check failed: {exc}")
        details["levelChecks"] = check_results

    if request.get("verify_batch_existence"):
        batch_checks: List[Dict[str, Any]] = []
        offset = 0
        for level, count in enumerate(level_counts):
            hashes = proof["proof"][offset:offset + count]
            start = proof["level_starts"][level] if level < len(proof["level_starts"]) else 0
            try:
                response = verify_hash_batch(
                    {
                        "data_type": state["request"]["data_type"],
                        "level": level,
                        "start": start,
                        "hashes": hashes,
                    },
                    api_key=api_key,
                )
                valid = response.get("mismatches", 0) == 0 and all(result == 1 for result in response.get("results", []))
                batch_checks.append(
                    {
                        "level": level,
                        "start": start,
                        "hashes": hashes,
                        "valid": valid,
                        "results": response.get("results", []),
                        "matches": response.get("matches", 0),
                        "mismatches": response.get("mismatches", 0),
                    }
                )
                if not valid:
                    details["batchChecks"] = batch_checks
                    details["batchExistenceMatch"] = False
                    return _invalid_result(details, f"Batch existence check failed at level={level}")
            except Exception as exc:
                batch_checks.append(
                    {
                        "level": level,
                        "start": start,
                        "hashes": hashes,
                        "valid": False,
                        "results": [],
                        "matches": 0,
                        "mismatches": len(hashes),
                    }
                )
                details["batchChecks"] = batch_checks
                details["batchExistenceMatch"] = False
                return _invalid_result(details, f"Batch existence check failed: {exc}")
            offset += count

        details["batchChecks"] = batch_checks
        details["batchExistenceMatch"] = True

    return {
        "valid": True,
        "details": details,
    }


verifyWithInclusion = verify_with_inclusion


def verify_merkle_proof(request: VerifyMerkleProofWithDetailsRequest) -> VerifyMerkleProofWithDetailsResult:
    levels_hash_type = _normalize_levels_hash_type(request.get("levels_hash_type"))
    if isinstance(levels_hash_type, dict):
        return _invalid_merkle_proof_result(levels_hash_type["error"])

    try:
        proof = _normalize_proof(request["proof"])
    except Exception as exc:
        return _invalid_merkle_proof_result(str(exc), levels_hash_type=levels_hash_type)

    level_counts = _normalize_level_counts(
        proof.get("level_counts", []),
        proof.get("levels", 0),
        len(proof.get("proof", [])),
    )
    if isinstance(level_counts, str):
        return _invalid_merkle_proof_result(level_counts, levels_hash_type=levels_hash_type, proof=proof)

    position_path = _build_position_path(int(proof["position"]), len(level_counts))
    pending, max_level, max_level_position, max_level_hash = _proof_inclusion_meta(proof, level_counts)

    if pending:
        return {
            "valid": False,
            "pending": True,
            "status": "pending",
            "message": _pending_merkle_proof_message(proof, level_counts, position_path),
            "details": _pending_merkle_proof_details(proof, level_counts),
            "positionPath": position_path,
            "levelsHashType": levels_hash_type,
            "maxLevel": max_level,
            "maxLevelPosition": max_level_position,
            "maxLevelHash": max_level_hash,
            "proof": proof,
        }

    details: List[str] = []
    offset = 0
    computed_root = ""
    for level in range(len(level_counts) - 1):
        count = level_counts[level]
        level_hashes = proof["proof"][offset:offset + count]
        level_start = proof["level_starts"][level] if level < len(proof["level_starts"]) else 0
        next_level_hashes = _proof_level_hashes(proof["proof"], level_counts, level + 1)
        next_level_start = proof["level_starts"][level + 1] if level + 1 < len(proof["level_starts"]) else 0
        next_level_position = position_path[level + 1]
        next_level_index = next_level_position - next_level_start
        computed_rollup = _hash_hex_concat(level_hashes, levels_hash_type)
        expected_hash = next_level_hashes[next_level_index] if 0 <= next_level_index < len(next_level_hashes) else None
        label = _display_levels_hash_type(levels_hash_type)

        if expected_hash is None:
            details.append(
                f"L{level}[{level_start}..{level_start + count - 1}] -> {label} -> "
                f"L{level + 1}[pos {next_level_position}, idx {next_level_index}]: pending"
            )
            return {
                "valid": True,
                "pending": False,
                "status": "valid",
                "message": f"Proof verified for existing levels ({level + 1} levels). Higher-level rollup pending.",
                "details": details + _higher_level_pending_details(level + 1, next_level_position, next_level_index),
                "positionPath": position_path,
                "levelsHashType": levels_hash_type,
                "computedRoot": computed_rollup,
                "maxLevel": max_level,
                "maxLevelPosition": max_level_position,
                "maxLevelHash": max_level_hash,
                "proof": proof,
            }

        matches = computed_rollup == expected_hash
        details.append(
            f"L{level}[{level_start}..{level_start + count - 1}] -> {label} -> "
            f"L{level + 1}[pos {next_level_position}, idx {next_level_index}]: {'✓' if matches else '✗'}"
        )
        if not matches:
            return {
                "valid": False,
                "pending": False,
                "status": "invalid",
                "message": f"Level {level} rollup mismatch at level {level + 1} position {next_level_position}.",
                "error": f"Computed {computed_rollup} but expected {expected_hash}",
                "details": details,
                "positionPath": position_path,
                "levelsHashType": levels_hash_type,
                "computedRoot": computed_rollup,
                "maxLevel": max_level,
                "maxLevelPosition": max_level_position,
                "maxLevelHash": max_level_hash,
                "proof": proof,
            }

        offset += count
        computed_root = computed_rollup

    final_level = len(level_counts) - 1
    final_level_hashes = _proof_level_hashes(proof["proof"], level_counts, final_level)
    if not final_level_hashes:
        return _invalid_merkle_proof_result(
            "Missing final proof level",
            levels_hash_type=levels_hash_type,
            proof=proof,
            position_path=position_path,
            max_level=max_level,
            max_level_position=max_level_position,
            max_level_hash=max_level_hash,
        )

    computed_root = final_level_hashes[0] if len(final_level_hashes) == 1 else _hash_hex_concat(final_level_hashes, levels_hash_type)
    if not proof["root"]:
        details.append("Root pending: final rollup not yet recorded in proof.root.")
        return {
            "valid": True,
            "pending": False,
            "status": "valid",
            "message": f"Proof verified for existing levels ({len(level_counts)} levels). Root pending.",
            "details": details,
            "positionPath": position_path,
            "levelsHashType": levels_hash_type,
            "computedRoot": computed_root,
            "maxLevel": max_level,
            "maxLevelPosition": max_level_position,
            "maxLevelHash": max_level_hash,
            "proof": proof,
        }

    root_matches = computed_root == proof["root"]
    details.append(f"Root: {'✓' if root_matches else '✗'} ({proof['root'][:16]}...)")
    if not root_matches:
        return {
            "valid": False,
            "pending": False,
            "status": "invalid",
            "message": "Root hash mismatch.",
            "error": f"Expected {proof['root']} but computed {computed_root}",
            "details": details,
            "positionPath": position_path,
            "levelsHashType": levels_hash_type,
            "computedRoot": computed_root,
            "maxLevel": max_level,
            "maxLevelPosition": max_level_position,
            "maxLevelHash": max_level_hash,
            "proof": proof,
        }

    return {
        "valid": True,
        "pending": False,
        "status": "valid",
        "message": f"Proof verified! {len(level_counts)} levels, {len(proof['proof'])} hashes.",
        "details": details,
        "positionPath": position_path,
        "levelsHashType": levels_hash_type,
        "computedRoot": computed_root,
        "maxLevel": max_level,
        "maxLevelPosition": max_level_position,
        "maxLevelHash": max_level_hash,
        "proof": proof,
    }


verifyMerkleProof = verify_merkle_proof


def _verify_record_core(request: VerifyRequest) -> Dict[str, Any]:
    details: Dict[str, Any] = {
        "lookupMode": "kayros_hash" if request.get("kayros_hash") else "data_item",
        "recordFound": False,
    }

    data_type = request.get("data_type") or ""
    data_item = request.get("data_item")
    kayros_hash = request.get("kayros_hash")
    api_key = request.get("api_key")

    if not data_type:
        return {"result": _invalid_result(details, "Missing data_type")}
    if not data_item and not kayros_hash:
        return {"result": _invalid_result(details, "Either data_item or kayros_hash is required")}

    try:
        if kayros_hash:
            record = _normalize_record(get_record_by_hash(kayros_hash, data_type, api_key=api_key))
        else:
            response = get_record_by_data_item(data_type, data_item or "", api_key=api_key)
            records = response.get("records", [])
            if not records:
                raise ValueError("Record not found")
            if len(records) > 1:
                raise ValueError(f"Multiple records found for data_item; provide kayros_hash (count={len(records)})")
            record = _normalize_record(records[0])
    except Exception as exc:
        return {"result": _invalid_result(details, f"Failed to fetch record: {exc}")}

    details["recordFound"] = True
    details["record"] = record
    details["dataTypeMatch"] = _data_type_matches(record, data_type)
    if not details["dataTypeMatch"]:
        return {"result": _invalid_result(details, f"Record data_type mismatch: expected={data_type} record={record['data_type']}")}

    if data_item is not None:
        normalized_data_item = _normalize_hex(data_item)
        details["dataItemMatch"] = normalized_data_item == record["data_item"]
        if not details["dataItemMatch"]:
            return {
                "result": _invalid_result(
                    details,
                    f"Record data_item mismatch: expected={normalized_data_item or data_item} record={record['data_item']}",
                )
            }

    if kayros_hash is not None:
        normalized_kayros_hash = _normalize_hex(kayros_hash)
        details["kayrosHashMatch"] = normalized_kayros_hash == record["kayros_hash"]
        if not details["kayrosHashMatch"]:
            return {
                "result": _invalid_result(
                    details,
                    f"Record hash mismatch: expected={normalized_kayros_hash or kayros_hash} record={record['kayros_hash']}",
                )
            }

    previous_record = None
    prev_hash = record.get("prev_hash")
    if prev_hash and not _is_zero_hash(prev_hash):
        try:
            previous_record = _normalize_record(get_record_by_hash(prev_hash, record["data_type"], api_key=api_key))
            details["previousRecord"] = previous_record
        except Exception as exc:
            return {"result": _invalid_result(details, f"Failed to fetch previous record: {exc}")}

    details["chainLinkMatch"] = (
        previous_record is None
        or (
            previous_record["data_type"] == record["data_type"]
            and previous_record["kayros_hash"] == record["prev_hash"]
        )
    )
    if not details["chainLinkMatch"]:
        return {"result": _invalid_result(details, "Previous record chain link mismatch")}

    try:
        computed = compute_hash_from_hex(
            {
                "prev_hash": record.get("prev_hash") or ZERO_HASH_32,
                "data_type": record["data_type"],
                "data_item": record["data_item"],
                "timeuuid": record["uuid"],
                "hash_type": record["hash_type"],
            },
            api_key=api_key,
        )
        details["computedRecordHash"] = _normalize_hex(computed.get("hash"))
    except Exception as exc:
        return {"result": _invalid_result(details, f"Failed to recompute Kayros hash: {exc}")}

    details["recordHashMatch"] = details["computedRecordHash"] == record["kayros_hash"]
    if not details["recordHashMatch"]:
        return {
            "result": _invalid_result(
                details,
                f"Kayros hash mismatch: computed={details['computedRecordHash']} record={record['kayros_hash']}",
            )
        }

    details["uuidTimestampMatch"] = bool(record.get("timestamp"))
    if not details["uuidTimestampMatch"]:
        return {"result": _invalid_result(details, "Invalid record UUID timestamp")}

    return {
        "result": {
            "valid": True,
            "details": details,
        },
        "state": {
            "request": {
                "data_type": data_type,
                "data_item": data_item,
                "kayros_hash": kayros_hash,
                "api_key": api_key,
            },
            "api_key": api_key,
            "record": record,
            "previous_record": previous_record,
            "details": details,
        },
    }


def _normalize_record(raw: Dict[str, Any]) -> Dict[str, Any]:
    data_type = raw.get("data_type") or ""
    data_item = _normalize_hex(raw.get("data_item")) or _normalize_hex(raw.get("data_item_hex"))
    kayros_hash = _normalize_hex(raw.get("hash_item")) or _normalize_hex(raw.get("hash_item_hex"))
    prev_hash = _normalize_hex(raw.get("prev_hash")) or _normalize_hex(raw.get("prev_hash_hex"))
    hash_type = raw.get("hash_type") or ""
    position = int(raw.get("position", 0))
    ts_value = raw.get("ts") or raw.get("uuid_hex") or ""
    uuid_hex = _uuid_string_to_hex(str(ts_value))
    timestamp = _timeuuid_hex_to_timestamp(uuid_hex) if uuid_hex else ""

    if not data_type or not data_item or not kayros_hash or not hash_type or not uuid_hex or not timestamp:
        raise ValueError("Invalid remote record structure")

    return {
        "data_type": data_type,
        "data_type_hex": _utf8_hex(data_type),
        "data_item": data_item,
        "kayros_hash": kayros_hash,
        "prev_hash": prev_hash,
        "hash_type": hash_type,
        "uuid": uuid_hex,
        "timestamp": timestamp,
        "position": position,
        "raw": raw,
    }


def _normalize_proof(raw: Dict[str, Any]) -> Dict[str, Any]:
    if not raw.get("success"):
        raise ValueError(raw.get("error") or raw.get("message") or "Missing merkle proof")

    hash_item = _normalize_hex(raw.get("hash_item"))
    root = _normalize_hex(raw.get("root")) or ""
    if not raw.get("data_type") or not hash_item or not isinstance(raw.get("proof"), list):
        raise ValueError("Invalid merkle proof structure")

    proof_hashes: List[str] = []
    for entry in raw.get("proof", []):
        normalized = _normalize_hex(entry)
        if not normalized:
            raise ValueError("Invalid proof hash")
        proof_hashes.append(normalized)

    return {
        "data_type": raw["data_type"],
        "hash_item": hash_item,
        "proof": proof_hashes,
        "root": root,
        "position": int(raw.get("position", 0)),
        "levels": int(raw.get("levels", 0)),
        "level_counts": [int(value) for value in raw.get("level_counts", [])],
        "level_starts": [int(value) for value in raw.get("level_starts", [])],
        "raw": raw,
    }


def _normalize_level_counts(counts: List[int], levels: int, proof_len: int) -> List[int] | str:
    if proof_len <= 0:
        return "empty proof path"
    if counts:
        if any(count <= 0 for count in counts):
            return "invalid level count"
        if sum(counts) != proof_len:
            return "proof length mismatch"
        return counts
    if levels <= 0 or levels == 1:
        return [proof_len]
    remaining = proof_len - (256 * (levels - 1))
    if remaining <= 0:
        return "proof length mismatch"
    return [256] * (levels - 1) + [remaining]


def _verify_proof_path(proof: Dict[str, Any], level_counts: List[int], levels_hash_type: str) -> Tuple[bool, str, str]:
    offset = 0
    previous_rollup = ""
    last_rollup = ""
    current_position = proof["position"]

    for level, count in enumerate(level_counts):
        if count <= 0:
            return False, "invalid level count", ""
        if offset + count > len(proof["proof"]):
            return False, "proof length mismatch", ""

        level_hashes = proof["proof"][offset:offset + count]
        if previous_rollup:
            index = _level_index_for_position(level, current_position, count, proof["level_starts"])
            if isinstance(index, str):
                return False, index, ""
            if level_hashes[index] != previous_rollup:
                return False, (
                    f"level hash mismatch level={level} index={index} "
                    f"expected={previous_rollup} got={level_hashes[index]}"
                ), ""

        is_last_level = level == len(level_counts) - 1
        if is_last_level and count == 1:
            last_rollup = level_hashes[0]
        else:
            previous_rollup = _hash_hex_concat(level_hashes, levels_hash_type)
            if is_last_level:
                last_rollup = previous_rollup

        offset += count
        current_position //= 256

    if not last_rollup:
        return False, "missing final hash", ""
    if proof["root"] and last_rollup != proof["root"]:
        return False, f"root hash mismatch computed={last_rollup} root={proof['root']}", last_rollup
    return True, "", last_rollup


def _verify_proof_target_position(proof: Dict[str, Any], target_hash: str, level_counts: List[int]) -> Tuple[bool, str]:
    if not level_counts or level_counts[0] <= 0:
        return False, "invalid level count"
    index = _level_index_for_position(0, proof["position"], level_counts[0], proof["level_starts"])
    if isinstance(index, str):
        return False, index
    if proof["proof"][index] != target_hash:
        return (
            False,
            f"target hash not found at expected position index={index} "
            f"expected={target_hash} got={proof['proof'][index]}",
        )
    return True, ""


def _proof_inclusion_meta(proof: Dict[str, Any], level_counts: List[int]) -> Tuple[bool, int, int, str]:
    if not proof.get("level_counts") or not level_counts:
        return True, -1, -1, ""

    positions = [proof["position"]]
    current_position = proof["position"]
    for _ in range(len(level_counts) - 1):
        current_position //= 256
        positions.append(current_position)

    max_level = len(level_counts) - 1
    max_level_position = positions[max_level] if positions else -1
    max_level_hash = proof.get("root") or ""
    if not max_level_hash:
        level_hashes = _proof_level_hashes(proof["proof"], level_counts, max_level)
        level_start = proof["level_starts"][max_level] if max_level < len(proof["level_starts"]) else 0
        index = max_level_position - level_start
        if 0 <= index < len(level_hashes):
            max_level_hash = level_hashes[index]

    if len(level_counts) < 2:
        pending = True
    else:
        level_start = proof["level_starts"][1] if len(proof["level_starts"]) > 1 else 0
        index = positions[1] - level_start
        pending = index < 0 or index >= level_counts[1]

    return pending, max_level, max_level_position, max_level_hash


def _build_position_path(position: int, levels: int) -> List[int]:
    if levels <= 0:
        return []
    path = [position]
    current_position = position
    for _ in range(1, levels):
        current_position //= 256
        path.append(current_position)
    return path


def _pending_merkle_proof_message(proof: Dict[str, Any], level_counts: List[int], position_path: List[int]) -> str:
    level0_count = level_counts[0] if level_counts else 0
    if len(level_counts) < 2:
        return f"Proof pending: L0 group has {level0_count} hashes and no L1 rollup yet."
    level1_position = position_path[1]
    level1_start = proof["level_starts"][1] if len(proof.get("level_starts", [])) > 1 else 0
    level1_index = level1_position - level1_start
    return f"Proof pending: L1[pos {level1_position}, idx {level1_index}] has not been generated yet."


def _pending_merkle_proof_details(proof: Dict[str, Any], level_counts: List[int]) -> List[str]:
    details: List[str] = []
    level0_start = proof["level_starts"][0] if proof.get("level_starts") else 0
    level0_count = level_counts[0] if level_counts else 0
    if level0_count > 0:
        details.append(f"L0[{level0_start}..{level0_start + level0_count - 1}] partial group")

    missing = [max(0, 256 - count) for count in level_counts]
    missing_l0 = missing[0] if missing else 0
    if missing_l0 > 0:
        details.append(f"Need {missing_l0:,} more L0 records to complete current L0 group.")

    last = len(level_counts) - 1
    missing_last = missing[last] if missing else 0
    if last > 0 and missing_last > 0:
        needed = missing_l0
        for level in range(1, last + 1):
            miss = missing[level]
            if miss > 0:
                needed += max(0, miss - 1) * (256 ** level)
        if needed > 0:
            details.append(f"~{needed:,} more L0 records to complete L{last} group (to get next-level rollup).")
    return details


def _higher_level_pending_details(level: int, position: int, index: int) -> List[str]:
    return [f"Higher-level rollup pending at L{level}[pos {position}, idx {index}]."]


def _invalid_merkle_proof_result(
    message: str,
    *,
    levels_hash_type: str = DEFAULT_LEVELS_HASH_TYPE,
    proof: Optional[Dict[str, Any]] = None,
    position_path: Optional[List[int]] = None,
    max_level: int = -1,
    max_level_position: int = -1,
    max_level_hash: str = "",
    computed_root: Optional[str] = None,
) -> VerifyMerkleProofWithDetailsResult:
    result: VerifyMerkleProofWithDetailsResult = {
        "valid": False,
        "pending": False,
        "status": "invalid",
        "message": message,
        "error": message,
        "details": [],
        "positionPath": position_path or [],
        "levelsHashType": levels_hash_type,
        "maxLevel": max_level,
        "maxLevelPosition": max_level_position,
        "maxLevelHash": max_level_hash,
    }
    if proof is not None:
        result["proof"] = proof
    if computed_root is not None:
        result["computedRoot"] = computed_root
    return result


def _display_levels_hash_type(levels_hash_type: str) -> str:
    if levels_hash_type == "sha256":
        return "SHA-256"
    if levels_hash_type == "sha3-256":
        return "SHA3-256"
    return levels_hash_type


def _proof_level_hashes(all_hashes: List[str], level_counts: List[int], level: int) -> List[str]:
    if level < 0 or level >= len(level_counts):
        return []
    offset = sum(level_counts[:level])
    count = level_counts[level]
    return all_hashes[offset:offset + count]


def _proof_hash_at_level_position(proof: Dict[str, Any], level_counts: List[int], level: int, position: int) -> Optional[str]:
    level_hashes = _proof_level_hashes(proof["proof"], level_counts, level)
    if not level_hashes:
        return None
    index = _level_index_for_position(level, position, len(level_hashes), proof["level_starts"])
    if isinstance(index, str):
        return None
    return level_hashes[index]


def _level_index_for_position(level: int, current_position: int, count: int, level_starts: List[int]) -> int | str:
    if count <= 0:
        return "invalid level count"
    start = level_starts[level] if level < len(level_starts) else (current_position // count) * count
    index = current_position - start
    if index < 0 or index >= count:
        return "proof index out of range"
    return index


def _normalize_levels_hash_type(value: Optional[str]) -> str | Dict[str, str]:
    if not value:
        return DEFAULT_LEVELS_HASH_TYPE

    normalized = value.strip().lower().replace("_", "-")
    if normalized in {"sha3", "sha3-256"}:
        return "sha3-256"
    if normalized in {"sha256", "sha-256"}:
        return "sha256"

    return {"error": f"Unsupported levels_hash_type: {value}"}


def _hash_hex_concat(hashes: List[str], levels_hash_type: str) -> str:
    payload = bytearray()
    for hash_value in hashes:
        payload.extend(bytes.fromhex(hash_value))
    if levels_hash_type == "sha256":
        return hashlib.sha256(payload).hexdigest()
    if levels_hash_type == "sha3-256":
        return hashlib.sha3_256(payload).hexdigest()
    raise ValueError(f"Unsupported levels_hash_type: {levels_hash_type}")


def _hash_response_matches(expected_hash: str, found_hash: Optional[str]) -> bool:
    normalized = _normalize_hex(found_hash)
    return normalized is None or normalized == expected_hash


def _data_type_matches(record: Dict[str, Any], expected: str) -> bool:
    return record["data_type"] == expected or record["data_type_hex"] == _utf8_hex(expected)


def _normalize_hex(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    decoded = _decode_flexible_bytes(value)
    return decoded.hex() if decoded is not None else None


def _decode_flexible_bytes(value: str) -> Optional[bytes]:
    trimmed = value.strip()
    if not trimmed:
        return None

    candidate = trimmed[2:] if trimmed.lower().startswith("0x") else trimmed
    if len(candidate) % 2 == 0:
        try:
            return bytes.fromhex(candidate)
        except ValueError:
            pass

    normalized = trimmed.replace("-", "+").replace("_", "/")
    padding = "=" * ((4 - len(normalized) % 4) % 4)
    try:
        return base64.b64decode(normalized + padding)
    except Exception:
        return None


def _utf8_hex(value: str) -> str:
    return value.encode("utf-8").hex()


def _uuid_string_to_hex(value: str) -> str:
    normalized = value.strip().replace("-", "").lower()
    if len(normalized) != 32:
        return ""
    try:
        bytes.fromhex(normalized)
    except ValueError:
        return ""
    return normalized


def _timeuuid_hex_to_timestamp(uuid_hex: str) -> str:
    try:
        uuid_bytes = bytes.fromhex(uuid_hex)
    except ValueError:
        return ""
    if len(uuid_bytes) != 16:
        return ""

    time_low = (uuid_bytes[0] << 24) | (uuid_bytes[1] << 16) | (uuid_bytes[2] << 8) | uuid_bytes[3]
    time_mid = (uuid_bytes[4] << 8) | uuid_bytes[5]
    time_hi = ((uuid_bytes[6] << 8) | uuid_bytes[7]) & 0x0FFF
    timestamp = time_low | (time_mid << 32) | (time_hi << 48)
    unix_nanos = (timestamp - UUID_GREGORIAN_EPOCH) * 100
    timestamp_dt = dt.datetime.fromtimestamp(unix_nanos / 1_000_000_000, tz=dt.timezone.utc)
    return timestamp_dt.isoformat().replace("+00:00", "Z")


def _is_zero_hash(value: str) -> bool:
    return all(char == "0" for char in value)


def _invalid_result(details: Dict[str, Any], error: str) -> VerifyResult:
    return {
        "valid": False,
        "error": error,
        "details": details,
    }
