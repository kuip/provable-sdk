"""
Tests for verify module
"""

import importlib
from unittest.mock import patch

from provable_sdk.hash import keccak256_str
from provable_sdk.types import KayrosEnvelope
from provable_sdk.verify import verify

verify_module = importlib.import_module("provable_sdk.verify")


class TestVerify:
    def test_allow_lookup_overrides(self):
        payload = "hello provable"
        data_hash = keccak256_str(payload)
        envelope = KayrosEnvelope(
            data=payload,
            kayros={
                "hash": data_hash,
                "hashAlgorithm": "keccak256",
                "timestamp": {
                    "service": "kayros",
                    "response": {
                        "response": {
                            "hash": "kayros_hash_123",
                            "data_type": "proof_type",
                        }
                    },
                },
            },
        )
        with patch.object(verify_module, "get_record_by_hash") as mock_get_record:
            mock_get_record.return_value = {
                "data_item": data_hash,
                "data_type": "proof_type",
                "hash_item": "remote_hash",
                "hash_type": "sha3_256",
                "position": 1,
                "ts": "2024-01-01T00:00:00Z",
            }

            result = verify(envelope, api_key="private-key-123", data_type=[None, "proof_type"])

            assert result["valid"] is True
            assert mock_get_record.call_args.kwargs["api_key"] == "private-key-123"
            assert mock_get_record.call_args.args[1] is None
