import json
from pathlib import Path

from provable_sdk.merkle_proof import (
    check_merkle_proof_compatibility,
    get_merkle_proof_levels,
    normalize_merkle_proof,
)


TESTDATA_DIR = Path(__file__).resolve().parents[2] / "testdata"
RECORD = json.loads((TESTDATA_DIR / "proof1_record.json").read_text())
PROOFS = [
    json.loads((TESTDATA_DIR / f"proof1_merkle_{version}.json").read_text())
    for version in (1, 2, 3, 4)
]


def test_real_proofs_belong_to_same_record():
    for proof in PROOFS:
        assert proof["data_type"] == RECORD["data_type"]
        assert proof["hash_item"] == RECORD["hash_item"]
        assert proof["position"] == RECORD["position"]


def test_normalize_merkle_proof_with_real_fixture():
    normalized = normalize_merkle_proof(PROOFS[0])
    assert len(normalized["proof"]) == 294
    assert normalized["level_counts"] == [160, 134]
    assert normalized["level_starts"] == [99840, 256]


def test_get_merkle_proof_levels_with_real_fixtures():
    levels_v1 = get_merkle_proof_levels(PROOFS[0])
    normalized_v1 = normalize_merkle_proof(PROOFS[0])
    assert levels_v1 == [
        {
            "level": 0,
            "start": 99840,
            "count": 160,
            "hashes": normalized_v1["proof"][:160],
        },
        {
            "level": 1,
            "start": 256,
            "count": 134,
            "hashes": normalized_v1["proof"][160:],
        },
    ]

    levels_v4 = get_merkle_proof_levels(PROOFS[3])
    assert [
        {"level": level["level"], "start": level["start"], "count": level["count"]}
        for level in levels_v4
    ] == [
        {"level": 0, "start": 99840, "count": 256},
        {"level": 1, "start": 256, "count": 256},
        {"level": 2, "start": 1, "count": 1},
    ]


def test_check_merkle_proof_compatibility_accepts_real_growth_chain():
    for previous_index, next_index in ((0, 1), (1, 2), (2, 3), (0, 3)):
        result = check_merkle_proof_compatibility(PROOFS[previous_index], PROOFS[next_index])
        assert result["compatible"] is True
        assert result["checkedEntries"] == len(PROOFS[previous_index]["proof"])
        assert result["mismatches"] == []


def test_check_merkle_proof_compatibility_reports_real_reverse_mismatches():
    result = check_merkle_proof_compatibility(PROOFS[3], PROOFS[0])
    assert result["compatible"] is False
    assert result["checkedEntries"] == 294
    assert {
        (
            mismatch["kind"],
            mismatch.get("level"),
            mismatch.get("position"),
            mismatch.get("previousIndex"),
        )
        for mismatch in result["mismatches"]
    } >= {
        ("missing_position", 0, 100000, 160),
        ("missing_position", 1, 390, 134),
        ("missing_level", 2, None, None),
    }
