"""
Verification utilities
"""

import json
import time
from typing import Any, Dict

from .hash import keccak256_str
from .api import get_record_by_hash
from .types import KayrosEnvelope, VerifyResult


def verify(envelope: KayrosEnvelope) -> VerifyResult:
    """
    Verify data against a Kayros proof

    Args:
        envelope: Dict containing data and kayros metadata

    Returns:
        Verification result with validity status and details
    """
    try:
        # Validate envelope structure
        if "kayros" not in envelope:
            return {
                "valid": False,
                "error": "Missing field: envelope.kayros",
            }

        kayros = envelope["kayros"]

        if "hash" not in kayros:
            return {
                "valid": False,
                "error": "Missing field: envelope.kayros.hash",
            }

        # Compute hash of the data (stringify as JSON for dict data)
        data = envelope["data"]
        if isinstance(data, str):
            data_string = data
        else:
            data_string = json.dumps(data, separators=(',', ':'))

        computed_hash = keccak256_str(data_string)
        envelope_hash = kayros["hash"]

        # Check if hashes match
        hash_match = computed_hash == envelope_hash

        if not hash_match:
            return {
                "valid": False,
                "error": "Hash mismatch: computed hash does not match envelope hash",
                "details": {
                    "hashMatch": False,
                    "computedHash": computed_hash,
                    "envelopeHash": envelope_hash,
                },
            }

        # If there's a timestamp, verify against remote record
        if "timestamp" in kayros and kayros["timestamp"]:
            timestamp = kayros["timestamp"]

            if "response" not in timestamp:
                return {
                    "valid": False,
                    "error": "Invalid timestamp response structure",
                    "details": {
                        "hashMatch": True,
                        "computedHash": computed_hash,
                        "envelopeHash": envelope_hash,
                    },
                }

            timestamp_response = timestamp["response"]

            if (not isinstance(timestamp_response, dict) or
                "data" not in timestamp_response or
                "computed_hash_hex" not in timestamp_response["data"]):
                return {
                    "valid": False,
                    "error": "Invalid timestamp response structure",
                    "details": {
                        "hashMatch": True,
                        "computedHash": computed_hash,
                        "envelopeHash": envelope_hash,
                    },
                }

            remote_hash = timestamp_response["data"]["computed_hash_hex"]

            try:
                # Fetch remote record with retry logic
                try:
                    remote_record = get_record_by_hash(remote_hash)
                except Exception:
                    # Retry once after 2 seconds
                    time.sleep(2)
                    remote_record = get_record_by_hash(remote_hash)

                if (not isinstance(remote_record, dict) or
                    "data" not in remote_record or
                    "data_item_hex" not in remote_record["data"]):
                    return {
                        "valid": False,
                        "error": "Invalid remote record structure",
                        "details": {
                            "hashMatch": True,
                            "computedHash": computed_hash,
                            "envelopeHash": envelope_hash,
                        },
                    }

                remote_data_item_hex = remote_record["data"]["data_item_hex"]
                remote_match = computed_hash == remote_data_item_hex

                if not remote_match:
                    return {
                        "valid": False,
                        "error": "Remote verification failed: hash does not match remote record",
                        "details": {
                            "hashMatch": True,
                            "remoteMatch": False,
                            "computedHash": computed_hash,
                            "envelopeHash": envelope_hash,
                            "remoteHash": remote_data_item_hex,
                        },
                    }

                return {
                    "valid": True,
                    "details": {
                        "hashMatch": True,
                        "remoteMatch": True,
                        "computedHash": computed_hash,
                        "envelopeHash": envelope_hash,
                        "remoteHash": remote_data_item_hex,
                    },
                }
            except Exception as e:
                return {
                    "valid": False,
                    "error": f"Failed to fetch remote record: {str(e)}",
                    "details": {
                        "hashMatch": True,
                        "computedHash": computed_hash,
                        "envelopeHash": envelope_hash,
                    },
                }

        # No timestamp, just verify local hash match
        return {
            "valid": True,
            "details": {
                "hashMatch": True,
                "computedHash": computed_hash,
                "envelopeHash": envelope_hash,
            },
        }
    except Exception as e:
        return {
            "valid": False,
            "error": f"Verification error: {str(e)}",
        }
