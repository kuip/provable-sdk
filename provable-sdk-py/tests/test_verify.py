"""
Tests for verification helpers.
"""

import hashlib
import importlib
from unittest.mock import patch

from provable_sdk.verify import verify, verify_with_inclusion

verify_module = importlib.import_module("provable_sdk.verify")


def to_base64(hex_value: str) -> str:
    return bytes.fromhex(hex_value).decode("latin1").encode("latin1").hex()


def b64(hex_value: str) -> str:
    import base64
    return base64.b64encode(bytes.fromhex(hex_value)).decode("ascii")


class TestVerify:
    def test_verify_by_kayros_hash(self):
        data_item = "11" * 32
        kayros_hash = "22" * 32

        with patch.object(verify_module, "get_record_by_hash") as mock_get_record, patch.object(
            verify_module, "compute_hash_from_hex"
        ) as mock_compute_hash:
            mock_get_record.return_value = {
                "data_item": b64(data_item),
                "data_type": "proof_type",
                "hash_item": b64(kayros_hash),
                "hash_type": "sha256",
                "position": 3,
                "prev_hash": b64("00" * 32),
                "ts": "123e4567-e89b-12d3-a456-426614174000",
            }
            mock_compute_hash.return_value = {
                "hash": kayros_hash,
                "hash_type": "sha256",
                "input_size": 92,
            }

            result = verify(
                {
                    "data_type": "proof_type",
                    "kayros_hash": kayros_hash,
                    "data_item": data_item,
                    "api_key": "private-key-123",
                }
            )

            assert result["valid"] is True
            assert result["details"]["recordFound"] is True
            assert result["details"]["recordHashMatch"] is True
            assert mock_get_record.call_args.kwargs["api_key"] == "private-key-123"

    def test_fail_when_data_item_lookup_is_ambiguous(self):
        data_item = "33" * 32

        with patch.object(verify_module, "get_record_by_data_item") as mock_get_record:
            mock_get_record.return_value = {
                "count": 2,
                "records": [
                    {
                        "data_item": b64(data_item),
                        "data_type": "proof_type",
                        "hash_item": b64("44" * 32),
                        "hash_type": "sha256",
                        "position": 1,
                        "prev_hash": b64("00" * 32),
                        "ts": "123e4567-e89b-12d3-a456-426614174000",
                    },
                    {
                        "data_item": b64(data_item),
                        "data_type": "proof_type",
                        "hash_item": b64("55" * 32),
                        "hash_type": "sha256",
                        "position": 2,
                        "prev_hash": b64("44" * 32),
                        "ts": "123e4567-e89b-12d3-a456-426614174001",
                    },
                ],
            }

            result = verify(
                {
                    "data_type": "proof_type",
                    "data_item": data_item,
                }
            )

            assert result["valid"] is False
            assert "Multiple records found" in result["error"]

    def test_verify_with_inclusion(self):
        data_item = "11" * 32
        kayros_hash = "22" * 32
        sibling_hash = "33" * 32
        root_hash = hashlib.sha256(bytes.fromhex(kayros_hash + sibling_hash)).hexdigest()

        with patch.object(verify_module, "get_record_by_hash") as mock_get_record, patch.object(
            verify_module, "compute_hash_from_hex"
        ) as mock_compute_hash, patch.object(verify_module, "get_merkle_proof") as mock_get_proof, patch.object(
            verify_module, "verify_hash_existence"
        ) as mock_hash_existence, patch.object(verify_module, "verify_hash_batch") as mock_hash_batch:
            mock_get_record.return_value = {
                "data_item": b64(data_item),
                "data_type": "proof_type",
                "hash_item": b64(kayros_hash),
                "hash_type": "sha256",
                "position": 0,
                "prev_hash": b64("00" * 32),
                "ts": "123e4567-e89b-12d3-a456-426614174000",
            }
            mock_compute_hash.return_value = {
                "hash": kayros_hash,
                "hash_type": "sha256",
                "input_size": 92,
            }
            mock_get_proof.return_value = {
                "success": True,
                "data_type": "proof_type",
                "hash_item": kayros_hash,
                "proof": [kayros_hash, sibling_hash, root_hash],
                "root": root_hash,
                "position": 0,
                "levels": 2,
                "level_counts": [2, 1],
                "level_starts": [0, 0],
            }
            mock_hash_existence.side_effect = [
                {
                    "exists": True,
                    "level": 1,
                    "position": 0,
                    "data_type": "proof_type",
                    "found_hash": root_hash,
                    "message": "ok",
                },
                {
                    "exists": True,
                    "level": 0,
                    "position": 0,
                    "data_type": "proof_type",
                    "found_hash": kayros_hash,
                    "message": "ok",
                },
            ]
            mock_hash_batch.side_effect = [
                {
                    "data_type": "proof_type",
                    "level": 0,
                    "start": 0,
                    "count": 2,
                    "results": [1, 1],
                    "matches": 2,
                    "mismatches": 0,
                },
                {
                    "data_type": "proof_type",
                    "level": 1,
                    "start": 0,
                    "count": 1,
                    "results": [1],
                    "matches": 1,
                    "mismatches": 0,
                },
            ]

            result = verify_with_inclusion(
                {
                    "data_type": "proof_type",
                    "kayros_hash": kayros_hash,
                    "trusted_root_hash": root_hash,
                    "trusted_level": 1,
                    "trusted_position": 0,
                    "verify_batch_existence": True,
                    "level_checks": [{"level": 0, "position": 0}],
                    "api_key": "private-key-456",
                }
            )

            assert result["valid"] is True
            assert result["details"]["proofPathMatch"] is True
            assert result["details"]["batchExistenceMatch"] is True
            assert result["details"]["levelChecks"][0]["valid"] is True
            assert result["details"]["trustedLevelMatch"] is True
