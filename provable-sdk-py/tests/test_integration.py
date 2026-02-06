"""
Integration test for full SDK cycle
Tests: data -> hash -> index with Kayros -> build proof -> verify
"""

import time
import base64
import pytest
from provable_sdk.hash import keccak256_str
from provable_sdk.api import prove_single_hash, get_record_by_hash
from provable_sdk.verify import verify
from provable_sdk.types import KayrosEnvelope


class TestFullCycleIntegration:
    @pytest.mark.timeout(30)
    def test_full_cycle_data_to_verified_proof(self):
        """Test complete cycle: data -> hash -> index -> verify"""

        test_data_type = "provable_sdk_tests"
        test_data_type_hex = test_data_type.encode("utf-8").hex()

        # Step 1: Start with test data
        test_data = f"Integration test data {int(time.time() * 1000)}"

        # Step 2: Hash the data
        data_hash = keccak256_str(test_data)
        assert len(data_hash) == 64
        assert all(c in "0123456789abcdef" for c in data_hash)

        # Step 3: Index with Kayros (prove the hash)
        kayros_response = prove_single_hash(data_hash, test_data_type)
        assert kayros_response is not None
        assert "hash" in kayros_response
        assert len(kayros_response["hash"]) == 64

        computed_hash = kayros_response["hash"]

        # Step 4: Build proof object (envelope)
        envelope = KayrosEnvelope(
            data=test_data,
            kayros={
                "hash": data_hash,
                "hashAlgorithm": "keccak256",
                "timestamp": {
                    "service": "kayros",
                    "response": {
                        **kayros_response,
                        "data": {"data_type_hex": test_data_type_hex},
                    },
                },
            },
        )

        # Step 5: Verify the proof
        verify_result = verify(envelope)

        # Verify result is valid
        assert verify_result["valid"] is True
        assert "error" not in verify_result or verify_result.get("error") is None

        # Verify hash matches
        assert verify_result["details"]["hashMatch"] is True
        assert verify_result["details"]["computedHash"] == data_hash
        assert verify_result["details"]["dataHash"] == data_hash

        # Verify remote record exists and matches
        assert verify_result["details"]["remoteMatch"] is True
        assert verify_result["details"]["remoteHash"] == data_hash

        # Step 6: Verify we can retrieve the record by hash using the computed hash from Kayros
        record = get_record_by_hash(computed_hash, test_data_type)
        assert record is not None
        decoded = base64.b64decode(record["data_item"]).hex()
        assert decoded == data_hash
