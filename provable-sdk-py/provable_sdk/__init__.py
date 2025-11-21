"""
Provable SDK for Python
"""

from .hash import hash, keccak256, hash_str, keccak256_str, sha256, sha256_str
from .api import prove_single_hash, get_record_by_hash
from .prove import prove_data, prove_data_str
from .verify import verify
from .types import (
    KayrosMetadata,
    KayrosEnvelope,
    ProveSingleHashResponse,
    GetRecordResponse,
    VerifyResult,
)
from .config import KAYROS_HOST, API_ROUTES

__version__ = "0.1.0"

__all__ = [
    "hash",
    "keccak256",
    "hash_str",
    "keccak256_str",
    "sha256",
    "sha256_str",
    "prove_single_hash",
    "get_record_by_hash",
    "prove_data",
    "prove_data_str",
    "verify",
    "KayrosMetadata",
    "KayrosEnvelope",
    "ProveSingleHashResponse",
    "GetRecordResponse",
    "VerifyResult",
    "KAYROS_HOST",
    "API_ROUTES",
]
