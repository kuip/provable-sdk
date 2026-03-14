"""
Verification utilities
"""

import base64
import time
from typing import Iterable, List, Optional, Set, Union

from .api import get_record_by_hash
from .types import KayrosEnvelope, VerifyResult


def verify(
    envelope: KayrosEnvelope,
    *,
    api_key: Optional[str] = None,
    data_type: Optional[Union[str, Iterable[Optional[str]]]] = None,
) -> VerifyResult:
    """
    Verify data against a Kayros proof

    Args:
        envelope: KayrosEnvelope containing data and kayros metadata

    Returns:
        Verification result with validity status and details
    """
    try:
        data_hash = (envelope.get_data_hash() or "").lower()

        if not data_hash:
            return {
                "valid": False,
                "error": "Missing hash in envelope",
            }

        computed_hash = envelope.compute_data_hash().lower()

        # Check if hashes match
        hash_match = computed_hash == data_hash

        if not hash_match:
            return {
                "valid": False,
                "error": f"Hash mismatch: computed={computed_hash} expected={data_hash}",
                "details": {
                    "hashMatch": False,
                    "computedHash": computed_hash,
                    "dataHash": data_hash,
                },
            }

        # If there's a Kayros hash, verify against remote record
        kayros_hash = envelope.get_kayros_hash()
        data_type_candidates = envelope.get_data_type_lookup_candidates()
        if data_type is not None:
            explicit_candidates = [data_type] if isinstance(data_type, str) else list(data_type)
            data_type_candidates = _merge_lookup_candidates(explicit_candidates, data_type_candidates)
        if not data_type_candidates:
            # None signals "omit data_type query param" in get_record_by_hash.
            data_type_candidates = [None]
        if kayros_hash:
            try:
                # Fetch remote record with retry logic and data_type fallbacks.
                remote_record = None
                last_error = None
                for data_type in data_type_candidates:
                    for delay in (1, 2, 2):
                        try:
                            remote_record = get_record_by_hash(kayros_hash, data_type, api_key=api_key)
                            last_error = None
                            break
                        except Exception as exc:
                            last_error = exc
                            time.sleep(delay)
                    if remote_record is not None:
                        break
                if remote_record is None and last_error is not None:
                    raise last_error

                remote_data_item_hex = None
                if isinstance(remote_record, dict):
                    remote_data_item_hex = remote_record.get("data_item")
                if isinstance(remote_data_item_hex, str):
                    if not _is_hex_64(remote_data_item_hex):
                        normalized = _normalize_remote_data_item_hex(remote_data_item_hex)
                        remote_data_item_hex = normalized
                if not remote_data_item_hex:
                    return {
                        "valid": False,
                        "error": "Invalid remote record structure",
                        "details": {
                            "hashMatch": True,
                            "computedHash": computed_hash,
                            "dataHash": data_hash,
                        },
                    }
                remote_data_item_hex = remote_data_item_hex.lower()
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


def _is_hex_64(value: str) -> bool:
    if len(value) != 64:
        return False
    try:
        int(value, 16)
        return True
    except ValueError:
        return False


def _normalize_remote_data_item_hex(value: str) -> str | None:
    if not value:
        return None

    try:
        decoded = base64.b64decode(value)
    except Exception:
        decoded = None

    if decoded is not None:
        try:
            decoded_text = decoded.decode("utf-8")
            if _is_hex_64(decoded_text):
                return decoded_text.lower()
        except Exception:
            pass

        if len(decoded) == 32:
            return decoded.hex()

    if _is_hex_64(value):
        return value.lower()

    return None


def _merge_lookup_candidates(
    explicit_candidates: List[Optional[str]],
    envelope_candidates: List[str],
) -> List[Optional[str]]:
    merged: List[Optional[str]] = []
    seen: Set[str] = set()

    for candidate in [*explicit_candidates, *envelope_candidates]:
        key = "__NONE__" if candidate is None else candidate
        if key in seen:
            continue
        seen.add(key)
        merged.append(candidate)

    return merged
