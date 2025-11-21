"""
Hashing utilities using keccak256 and SHA-256
"""

import hashlib
from Crypto.Hash import keccak


def keccak256(data: bytes) -> str:
    """
    Compute keccak256 hash of bytes

    Args:
        data: Input data as bytes

    Returns:
        Hex string of the hash
    """
    k = keccak.new(digest_bits=256)
    k.update(data)
    return k.hexdigest()


# Alias for keccak256
hash = keccak256


def keccak256_str(s: str) -> str:
    """
    Compute keccak256 hash of a UTF-8 string

    Args:
        s: Input string

    Returns:
        Hex string of the hash
    """
    data = s.encode('utf-8')
    return keccak256(data)


# Alias for keccak256_str
hash_str = keccak256_str


def sha256(data: bytes) -> str:
    """
    Compute SHA-256 hash of bytes

    Args:
        data: Input data as bytes

    Returns:
        Hex string of the hash
    """
    return hashlib.sha256(data).hexdigest()


def sha256_str(s: str) -> str:
    """
    Compute SHA-256 hash of a UTF-8 string

    Args:
        s: Input string

    Returns:
        Hex string of the hash
    """
    data = s.encode('utf-8')
    return sha256(data)
