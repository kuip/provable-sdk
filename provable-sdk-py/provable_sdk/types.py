"""
Provable SDK Types
"""

from typing import TypedDict, Optional, Any, Dict, List

class GetRecordResponse(TypedDict, total=False):
    data_item: str
    data_type: str
    hash_item: str
    hash_type: str
    position: int
    prev_hash: str
    ts: str


class ProveSingleHashResponse(TypedDict, total=False):
    success: bool
    hash: str
    timeuuid: str
    encoding: str
    error: str


class VerifyRequest(TypedDict, total=False):
    data_type: str
    data_item: str
    kayros_hash: str
    api_key: str


class VerifyLevelCheck(TypedDict, total=False):
    level: int
    position: int
    hash: str


class VerifyWithInclusionRequest(VerifyRequest, total=False):
    trusted_root_hash: str
    trusted_level: int
    trusted_position: int
    levels_hash_type: str
    verify_batch_existence: bool
    level_checks: List[VerifyLevelCheck]


class NormalizedKayrosRecord(TypedDict, total=False):
    data_type: str
    data_type_hex: str
    data_item: str
    kayros_hash: str
    prev_hash: str
    hash_type: str
    uuid: str
    timestamp: str
    position: int
    raw: Dict[str, Any]


class NormalizedMerkleProof(TypedDict, total=False):
    data_type: str
    hash_item: str
    proof: List[str]
    root: str
    position: int
    levels: int
    level_counts: List[int]
    level_starts: List[int]
    raw: Dict[str, Any]


MerkleProofInput = Dict[str, Any]


class MerkleProofLevel(TypedDict):
    level: int
    start: int
    count: int
    hashes: List[str]


class MerkleProofCompatibilityMismatch(TypedDict, total=False):
    kind: str
    level: int
    position: int
    previousIndex: int
    nextIndex: int
    previousPosition: int
    nextPosition: int
    previousHash: str
    nextHash: str
    message: str


class MerkleProofCompatibilityResult(TypedDict):
    compatible: bool
    checkedEntries: int
    previous: NormalizedMerkleProof
    next: NormalizedMerkleProof
    previousLevels: List[MerkleProofLevel]
    nextLevels: List[MerkleProofLevel]
    mismatches: List[MerkleProofCompatibilityMismatch]


class LevelCheckResult(TypedDict, total=False):
    level: int
    position: int
    hash: str
    valid: bool
    exists: bool
    found_hash: str
    message: str


class BatchExistenceCheckResult(TypedDict, total=False):
    level: int
    start: int
    hashes: List[str]
    valid: bool
    results: List[int]
    matches: int
    mismatches: int


class VerifyResultDetails(TypedDict, total=False):
    lookupMode: str
    recordFound: bool
    ambiguous: bool
    ambiguousCount: int
    dataTypeMatch: bool
    dataItemMatch: bool
    kayrosHashMatch: bool
    recordHashMatch: bool
    chainLinkMatch: bool
    uuidTimestampMatch: bool
    proofFetched: bool
    proofDataTypeMatch: bool
    proofHashItemMatch: bool
    proofPathMatch: bool
    targetPositionMatch: bool
    trustedRootMatch: bool
    trustedLevelMatch: bool
    batchExistenceMatch: bool
    levelsHashType: str
    pending: bool
    maxLevel: int
    maxLevelPosition: int
    maxLevelHash: str
    computedRecordHash: str
    localRootHash: str
    record: NormalizedKayrosRecord
    previousRecord: NormalizedKayrosRecord
    proof: NormalizedMerkleProof
    levelChecks: List[LevelCheckResult]
    batchChecks: List[BatchExistenceCheckResult]


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


class ComputeHashRequest(TypedDict, total=False):
    prev_hash: str
    data_type: str
    data_item: str
    timeuuid: str
    hash_type: str


class ComputeHashResponse(TypedDict):
    hash: str
    hash_type: str
    input_size: int


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
class GetRecordByDataItemResponse(TypedDict):
    records: List[Dict[str, Any]]
    count: int


class MerkleProofResponse(TypedDict, total=False):
    success: bool
    data_type: str
    hash_item: str
    proof: List[str]
    root: str
    position: int
    levels: int
    level_counts: List[int]
    level_starts: List[int]
    message: str
    error: str


class HashExistenceRequest(TypedDict):
    data_type: str
    level: int
    position: int
    hash: str


class HashExistenceResponse(TypedDict, total=False):
    exists: bool
    level: int
    position: int
    data_type: str
    found_hash: str
    message: str
    error: str


class HashBatchRequest(TypedDict):
    data_type: str
    level: int
    start: int
    hashes: List[str]


class HashBatchResponse(TypedDict, total=False):
    data_type: str
    level: int
    start: int
    count: int
    results: List[int]
    matches: int
    mismatches: int
    message: str
    error: str


# API Response wrapper
class APIResponse(TypedDict, total=False):
    success: bool
    message: Optional[str]
    data: Any
    error: Optional[str]
