"""
Prove data utilities
"""

from .hash import keccak256, keccak256_str
from .api import prove_single_hash
from .types import ProveSingleHashResponse


def prove_data(data: bytes, data_type: str = None) -> ProveSingleHashResponse:
    """
    Prove data by computing its hash and calling Kayros API

    Args:
        data: Input data as bytes
        data_type: Optional data type identifier (defaults to "provable_sdk" padded to 32 bytes)

    Returns:
        The Kayros response
    """
    data_hash = keccak256(data)
    return prove_single_hash(data_hash, data_type)


def prove_data_str(s: str, data_type: str = None) -> ProveSingleHashResponse:
    """
    Prove string data by computing its hash and calling Kayros API

    Args:
        s: Input string
        data_type: Optional data type identifier (defaults to "provable_sdk" padded to 32 bytes)

    Returns:
        The Kayros response
    """
    data_hash = keccak256_str(s)
    return prove_single_hash(data_hash, data_type)
