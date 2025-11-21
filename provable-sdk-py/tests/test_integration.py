"""
Integration test for full SDK cycle
Tests: data -> hash -> index with Kayros -> build proof -> verify
"""

import time
import pytest
from provable_sdk.hash import keccak256_str
from provable_sdk.api import prove_single_hash, get_record_by_hash
from provable_sdk.verify import verify


class TestFullCycleIntegration:
    @pytest.mark.timeout(30)
    def test_full_cycle_data_to_verified_proof(self):
        """Test complete cycle: data -> hash -> index -> verify"""

        # Step 1: Start with test data
        test_data = f"Integration test data {int(time.time() * 1000)}"

        # Step 2: Hash the data
        data_hash = keccak256_str(test_data)
        assert len(data_hash) == 64
        assert all(c in "0123456789abcdef" for c in data_hash)

        # Step 3: Index with Kayros (prove the hash)
        kayros_response = prove_single_hash(data_hash)
        assert kayros_response is not None
        assert "data" in kayros_response
        assert "computed_hash_hex" in kayros_response["data"]
        assert len(kayros_response["data"]["computed_hash_hex"]) == 64

        computed_hash = kayros_response["data"]["computed_hash_hex"]

        # Step 4: Build proof object (envelope)
        envelope = {
            "data": test_data,
            "kayros": {
                "hash": data_hash,
                "hashAlgorithm": "keccak256",
                "timestamp": {
                    "service": "kayros",
                    "response": kayros_response,
                },
            },
        }

        # Step 5: Verify the proof
        verify_result = verify(envelope)

        # Verify result is valid
        assert verify_result["valid"] is True
        assert "error" not in verify_result or verify_result.get("error") is None

        # Verify hash matches
        assert verify_result["details"]["hashMatch"] is True
        assert verify_result["details"]["computedHash"] == data_hash
        assert verify_result["details"]["envelopeHash"] == data_hash

        # Verify remote record exists and matches
        assert verify_result["details"]["remoteMatch"] is True
        assert verify_result["details"]["remoteHash"] == data_hash

        # Step 6: Verify we can retrieve the record by hash using the computed hash from Kayros
        record = get_record_by_hash(computed_hash)
        assert record is not None
        assert "data" in record
        assert record["data"]["data_item_hex"] == data_hash
