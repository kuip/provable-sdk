"""
Provable SDK Types
"""

from typing import TypedDict, Optional, Any, Dict


class KayrosTimestamp(TypedDict, total=False):
    service: str
    response: Any


class KayrosMetadata(TypedDict, total=False):
    hash: str
    hashAlgorithm: str
    timestamp: KayrosTimestamp


class KayrosEnvelope(TypedDict):
    data: Any
    kayros: KayrosMetadata


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
    envelopeHash: str
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
