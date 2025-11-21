"""
Tests for hash module
"""

import pytest
from provable_sdk.hash import (
    hash,
    keccak256,
    hash_str,
    keccak256_str,
    sha256,
    sha256_str,
)


class TestKeccak256:
    def test_hash_empty_data(self):
        data = b""
        result = keccak256(data)
        assert result == "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"

    def test_hash_simple_data(self):
        data = b"hello"
        result = keccak256(data)
        assert len(result) == 64  # 32 bytes in hex
        import re
        assert re.match(r"^[0-9a-f]{64}$", result)

    def test_produce_consistent_results(self):
        data = b"test"
        hash1 = keccak256(data)
        hash2 = keccak256(data)
        assert hash1 == hash2

    def test_produce_different_hashes_for_different_data(self):
        data1 = b"hello"
        data2 = b"world"
        assert keccak256(data1) != keccak256(data2)


class TestKeccak256Str:
    def test_hash_empty_string(self):
        result = keccak256_str("")
        assert result == "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"

    def test_hash_simple_string(self):
        result = keccak256_str("hello")
        assert len(result) == 64
        import re
        assert re.match(r"^[0-9a-f]{64}$", result)

    def test_match_keccak256_with_encoded_data(self):
        s = "test string"
        data = s.encode("utf-8")
        assert keccak256_str(s) == keccak256(data)


class TestHashAliases:
    def test_hash_same_as_keccak256(self):
        data = b"test"
        assert hash(data) == keccak256(data)

    def test_hash_str_same_as_keccak256_str(self):
        assert hash_str("test") == keccak256_str("test")


class TestSHA256:
    def test_hash_empty_data(self):
        data = b""
        result = sha256(data)
        assert result == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    def test_hash_simple_data(self):
        data = b"hello"
        result = sha256(data)
        assert len(result) == 64
        import re
        assert re.match(r"^[0-9a-f]{64}$", result)

    def test_produce_consistent_results(self):
        data = b"test"
        hash1 = sha256(data)
        hash2 = sha256(data)
        assert hash1 == hash2

    def test_produce_different_hashes_for_different_data(self):
        data1 = b"hello"
        data2 = b"world"
        assert sha256(data1) != sha256(data2)


class TestSHA256Str:
    def test_hash_empty_string(self):
        result = sha256_str("")
        assert result == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    def test_hash_simple_string(self):
        result = sha256_str("hello")
        assert len(result) == 64
        import re
        assert re.match(r"^[0-9a-f]{64}$", result)

    def test_match_sha256_with_encoded_data(self):
        s = "test string"
        data = s.encode("utf-8")
        assert sha256_str(s) == sha256(data)


class TestHashAlgorithmsComparison:
    def test_keccak256_and_sha256_produce_different_hashes(self):
        data = b"test"
        keccak_hash = keccak256(data)
        sha256_hash = sha256(data)
        assert keccak_hash != sha256_hash
