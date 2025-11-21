"""
Prove data utilities
"""

from .hash import keccak256, keccak256_str
from .api import prove_single_hash
from .types import ProveSingleHashResponse


def prove_data(data: bytes) -> ProveSingleHashResponse:
    """
    Prove data by computing its hash and calling Kayros API

    Args:
        data: Input data as bytes

    Returns:
        The Kayros response
    """
    data_hash = keccak256(data)
    return prove_single_hash(data_hash)


def prove_data_str(s: str) -> ProveSingleHashResponse:
    """
    Prove string data by computing its hash and calling Kayros API

    Args:
        s: Input string

    Returns:
        The Kayros response
    """
    data_hash = keccak256_str(s)
    return prove_single_hash(data_hash)
