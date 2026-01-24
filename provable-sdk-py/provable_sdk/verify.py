"""
Verification utilities
"""

import base64
import json
import time
from typing import Any, Dict

from .hash import keccak256, keccak256_str, sha256, sha256_str
from .api import get_record_by_hash
from .types import KayrosEnvelope, VerifyResult


def _compute_hash_str(data: str, algorithm: str = None) -> str:
    """
    Compute hash of a string using the specified algorithm
    """
    normalized_algorithm = (algorithm or "sha256").lower()

    if normalized_algorithm in ("keccak256", "keccak-256"):
        return keccak256_str(data)

    # Default to sha256 for 'sha256', 'sha-256', or any other value
    return sha256_str(data)


def _compute_hash_bytes(data: bytes, algorithm: str = None) -> str:
    """
    Compute hash of bytes using the specified algorithm
    """
    normalized_algorithm = (algorithm or "sha256").lower()

    if normalized_algorithm in ("keccak256", "keccak-256"):
        return keccak256(data)

    # Default to sha256 for 'sha256', 'sha-256', or any other value
    return sha256(data)


def verify(envelope: KayrosEnvelope) -> VerifyResult:
    """
    Verify data against a Kayros proof

    Args:
        envelope: KayrosEnvelope containing data and kayros metadata

    Returns:
        Verification result with validity status and details
    """
    try:
        data_hash = envelope.get_data_hash()

        if not data_hash:
            return {
                "valid": False,
                "error": "Missing hash in envelope",
            }

        if envelope.is_v0():
            # V0 format (legacy, used only for email proofs): data is base64 encoded, hash the decoded bytes
            if not isinstance(envelope.data, str):
                return {
                    "valid": False,
                    "error": "V0 envelope data must be a base64 string",
                }
            try:
                decoded_bytes = base64.b64decode(envelope.data)
            except Exception as e:
                return {
                    "valid": False,
                    "error": f"Failed to decode base64 data: {str(e)}",
                }
            computed_hash = _compute_hash_bytes(decoded_bytes, envelope.get_hash_algorithm())
        else:
            # V1 format: hash the string directly or JSON.stringify for objects
            if isinstance(envelope.data, str):
                data_string = envelope.data
            else:
                data_string = json.dumps(envelope.data, separators=(',', ':'))
            computed_hash = _compute_hash_str(data_string, envelope.get_hash_algorithm())

        # Check if hashes match
        hash_match = computed_hash == data_hash

        if not hash_match:
            return {
                "valid": False,
                "error": "Hash mismatch: computed hash does not match data hash",
                "details": {
                    "hashMatch": False,
                    "computedHash": computed_hash,
                    "dataHash": data_hash,
                },
            }

        # If there's a Kayros hash, verify against remote record
        kayros_hash = envelope.get_kayros_hash()
        if kayros_hash:
            try:
                # Fetch remote record with retry logic
                try:
                    remote_record = get_record_by_hash(kayros_hash)
                except Exception:
                    # Retry once after 2 seconds
                    time.sleep(2)
                    remote_record = get_record_by_hash(kayros_hash)

                if (not isinstance(remote_record, dict) or
                    "data" not in remote_record or
                    "data_item_hex" not in remote_record["data"]):
                    return {
                        "valid": False,
                        "error": "Invalid remote record structure",
                        "details": {
                            "hashMatch": True,
                            "computedHash": computed_hash,
                            "dataHash": data_hash,
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
                            "dataHash": data_hash,
                            "remoteHash": remote_data_item_hex,
                        },
                    }

                return {
                    "valid": True,
                    "details": {
                        "hashMatch": True,
                        "remoteMatch": True,
                        "computedHash": computed_hash,
                        "dataHash": data_hash,
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
                        "dataHash": data_hash,
                    },
                }

        # No remote verification needed, just verify local hash match
        return {
            "valid": True,
            "details": {
                "hashMatch": True,
                "computedHash": computed_hash,
                "dataHash": data_hash,
            },
        }
    except Exception as e:
        return {
            "valid": False,
            "error": f"Verification error: {str(e)}",
        }
