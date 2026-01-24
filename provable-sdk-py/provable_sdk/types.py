"""
Provable SDK Types
"""

import base64
import json
from typing import TypedDict, Optional, Any, Dict

from .hash import keccak256, sha256

class KayrosTimestamp(TypedDict, total=False):
    service: str
    response: Any


class KayrosMetadataV0Data(TypedDict, total=False):
    """Data field in V0 format (from APIResponse)"""
    data_item_hex: str
    computed_hash_hex: str
    data_type: str
    data_type_hex: str
    message: str
    success: bool
    timeuuid_hex: str


class KayrosMetadata(TypedDict, total=False):
    """V1 format metadata"""
    hash: str
    hashAlgorithm: str
    timestamp: KayrosTimestamp


class KayrosMetadataV0(TypedDict, total=False):
    """V0 format metadata (APIResponse-based)"""
    success: bool
    message: str
    data: KayrosMetadataV0Data
    error: str
    hash: str
    hashAlgorithm: str


class KayrosEnvelope:
    """Kayros envelope with data and proof metadata"""

    def __init__(self, data: Any, kayros: Dict[str, Any]):
        self.data = data
        self.kayros = kayros

    def _get_metadata_data(self) -> Optional[Dict[str, Any]]:
        """Get the data dict from metadata (V0 or V1 timestamp response)"""
        if "data" in self.kayros and isinstance(self.kayros["data"], dict):
            return self.kayros["data"]
        if "timestamp" in self.kayros and isinstance(self.kayros["timestamp"], dict):
            response = self.kayros["timestamp"].get("response", {})
            if isinstance(response, dict) and "data" in response:
                return response["data"]
        return None

    def get_data_hash(self) -> Optional[str]:
        """Get the data hash (data_item_hex) from the metadata"""
        # V1 format: hash is directly on metadata
        if "hash" in self.kayros and self.kayros["hash"]:
            return self.kayros["hash"]
        # V0 format or V1 with timestamp response
        data = self._get_metadata_data()
        if data and "data_item_hex" in data and data["data_item_hex"]:
            return data["data_item_hex"]
        return None

    def get_data_type(self) -> Optional[str]:
        """Get the data type (data_type_hex) from the metadata"""
        data = self._get_metadata_data()
        if data and "data_type_hex" in data:
            return data["data_type_hex"]
        return None

    def get_data_type_label(self) -> Optional[str]:
        """Get the data type label by decoding data_type_hex."""
        data_type_hex = self.get_data_type()
        if not data_type_hex:
            return None

        normalized = data_type_hex[2:] if data_type_hex.startswith("0x") else data_type_hex
        if len(normalized) == 0 or len(normalized) % 2 != 0:
            return None

        try:
            decoded = bytes.fromhex(normalized).decode("utf-8", errors="ignore")
        except ValueError:
            return None

        trimmed = decoded.replace("\x00", "").strip()
        return trimmed or None

    def get_kayros_hash(self) -> Optional[str]:
        """Get the Kayros hash (computed_hash_hex) from the metadata"""
        data = self._get_metadata_data()
        if data and "computed_hash_hex" in data:
            return data["computed_hash_hex"]
        return None

    def get_time_uuid(self) -> Optional[str]:
        """Get the time UUID (timeuuid_hex) from the metadata"""
        data = self._get_metadata_data()
        if data and "timeuuid_hex" in data:
            return data["timeuuid_hex"]
        return None

    def get_hash_algorithm(self) -> str:
        """Get the hash algorithm (normalized to lowercase, defaults to sha256)"""
        algorithm = self.kayros.get("hashAlgorithm", "sha256")
        return (algorithm or "sha256").lower()

    def is_v0(self) -> bool:
        """Check if this is the V0 format (legacy, used only for email proofs).
        V0 envelopes have base64-encoded data that must be decoded before hashing."""
        return (
            "hash" not in self.kayros or not self.kayros.get("hash")
        ) and (
            "data" in self.kayros
            and isinstance(self.kayros["data"], dict)
            and "data_item_hex" in self.kayros["data"]
        )

    def get_data(self) -> bytes:
        """Get the data as bytes.
        For V0 (legacy email proofs): decodes base64 data to bytes.
        For V1: stringifies objects to JSON and encodes as UTF-8 bytes."""
        if self.is_v0():
            # V0 format: data is base64 encoded
            if not isinstance(self.data, str):
                raise ValueError("V0 envelope data must be a base64 string")
            return base64.b64decode(self.data)
        else:
            # V1 format: stringify objects to JSON, encode as UTF-8
            if isinstance(self.data, str):
                return self.data.encode('utf-8')
            return json.dumps(self.data, separators=(',', ':')).encode('utf-8')

    def compute_data_hash(self) -> str:
        """Compute the data hash using the envelope hash algorithm."""
        data = self.get_data()
        algorithm = self.get_hash_algorithm()

        if algorithm in ("keccak256", "keccak-256"):
            return keccak256(data)

        return sha256(data)


class ProveSingleHashResponseData(TypedDict):
    computed_hash_hex: str


class ProveSingleHashResponse(TypedDict):
    data: ProveSingleHashResponseData


class GetRecordResponseData(TypedDict, total=False):
    data_item_hex: str
    timestamp: str


class GetRecordResponse(TypedDict):
    data: GetRecordResponseData


class VerifyResultDetails(TypedDict, total=False):
    hashMatch: bool
    remoteMatch: bool
    computedHash: str
    dataHash: str
    remoteHash: str


class VerifyResult(TypedDict, total=False):
    valid: bool
    error: Optional[str]
    details: VerifyResultDetails


# Database types
class DatabaseQuery(TypedDict, total=False):
    data_type: Optional[str]
    hash_type: Optional[str]
    min_timestamp: Optional[str]
    max_timestamp: Optional[str]
    limit: int
    offset: int
    order_by: str  # ts_asc or ts_desc


class HashRecord(TypedDict):
    timestamp: str
    data_type: str
    data_item: str  # base64 or hex
    hash_type: str
    hash_item: str  # base64 or hex


class DatabaseStats(TypedDict):
    total_hashes: int
    count_by_type: Dict[str, int]
    min_timestamp: str
    max_timestamp: str
    timestamp_range: str


class ColumnInfo(TypedDict):
    name: str
    type: str


class TableBrowseRequest(TypedDict, total=False):
    table_name: str
    offset: int
    limit: int
    order_by: Optional[str]
    search_term: Optional[str]
    search_column: Optional[str]


class DatabaseRecord(TypedDict, total=False):
    data_type: str
    data_item_hex: str
    uuid_hex: str
    hash_item_hex: str
    prev_hash_hex: Optional[str]
    hash_type: str
    timestamp: str


# Hash verification types
class HashVerifyRequest(TypedDict):
    prev_hash: str  # hex
    data_type: str
    data_item: str  # hex
    uuid: str  # hex
    hash_type: str  # blake3 or xxh3


class HashVerifyResult(TypedDict):
    computed_hash: str  # hex
    hash_input_hex: str


class ComputeHashRequest(TypedDict):
    hash_input_hex: str
    hash_type: str  # blake3 or xxh3


# gRPC types
class SingleHashRequest(TypedDict):
    data_type: str  # 64 hex chars (32 bytes)
    data_item: str  # 64 hex chars (32 bytes)


class SingleHashResponse(TypedDict):
    success: bool
    message: str
    data_type: str
    data_item: str
    computed_hash_hex: str
    timeuuid_hex: str
    data_type_hex: str
    data_item_hex: str


# Merkle proof types
class GenerateMerkleProofRequest(TypedDict, total=False):
    hash_item: str
    data_type: Optional[str]
    timestamp: Optional[str]


class MerkleProof(TypedDict):
    target_hash_hex: str
    data_type: str
    timestamp: str
    position: int
    root_hash_hex: str
    proof_hashes_hex: list[str]
    levels: int
    stored_root_hex: str
    generated_at: str
    lightnet_version: str
    proof_format: str


class VerifyMerkleProofRequest(TypedDict):
    target_hash_hex: str
    proof_hashes_hex: list[str]  # must be 256 entries
    levels: int
    position: int
    root_hash_hex: str


class MerkleProofVerificationResult(TypedDict):
    valid: bool
    message: str
    computed_root_hex: str
    stored_root_hex: str
    target_hash_hex: str
    position: int


# API Response wrapper
class APIResponse(TypedDict, total=False):
    success: bool
    message: Optional[str]
    data: Any
    error: Optional[str]
