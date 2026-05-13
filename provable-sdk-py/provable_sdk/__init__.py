"""
Provable SDK for Python
"""

from importlib.metadata import PackageNotFoundError, version

from .hash import hash, keccak256, hash_str, keccak256_str, sha256, sha256_str
from .api import prove_single_hash, get_record_by_hash
from .prove import prove_data, prove_data_str
from .verify import verify, verify_with_inclusion, verifyWithInclusion
from .merkle_proof import (
    normalize_merkle_proof,
    get_merkle_proof_levels,
    check_merkle_proof_compatibility,
    normalizeMerkleProof,
    getMerkleProofLevels,
    checkMerkleProofCompatibility,
)
from .lightnet import (
    query_hashes,
    get_database_stats,
    get_latest_hashes,
    get_tables,
    get_table_schema,
    browse_table,
    get_record,
    get_record_with_prev_hash,
    get_record_by_data_item,
    verify_hash,
    compute_hash_from_hex,
    send_single_grpc_request,
    get_merkle_proof,
    verify_hash_existence,
    verify_hash_batch,
)
from .types import (
    ProveSingleHashResponse,
    GetRecordResponse,
    GetRecordByDataItemResponse,
    VerifyResult,
    VerifyRequest,
    VerifyWithInclusionRequest,
    VerifyLevelCheck,
    NormalizedKayrosRecord,
    NormalizedMerkleProof,
    MerkleProofInput,
    MerkleProofLevel,
    MerkleProofCompatibilityMismatch,
    MerkleProofCompatibilityResult,
    LevelCheckResult,
    BatchExistenceCheckResult,
    # Database types
    DatabaseQuery,
    HashRecord,
    DatabaseStats,
    ColumnInfo,
    TableBrowseRequest,
    DatabaseRecord,
    # Hash verification types
    HashVerifyRequest,
    HashVerifyResult,
    ComputeHashRequest,
    ComputeHashResponse,
    HashExistenceRequest,
    HashExistenceResponse,
    HashBatchRequest,
    HashBatchResponse,
    # gRPC types
    SingleHashRequest,
    SingleHashResponse,
    # Merkle proof types
    MerkleProofResponse,
    # API Response wrapper
    APIResponse,
)
from .config import (
    KAYROS_HOST,
    API_ROUTES,
    DATA_TYPE,
    DEFAULT_API_KEY,
    DEFAULT_USER_KEY,
    get_api_key,
    get_kayros_url,
    get_record_url,
    set_api_key,
    set_user_key,
    get_user_key,
)

try:
    __version__ = version("provable-sdk")
except PackageNotFoundError:
    # Local source execution without installed distribution metadata.
    __version__ = "0.0.0"

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
    "verify_with_inclusion",
    "verifyWithInclusion",
    "normalize_merkle_proof",
    "get_merkle_proof_levels",
    "check_merkle_proof_compatibility",
    "normalizeMerkleProof",
    "getMerkleProofLevels",
    "checkMerkleProofCompatibility",
    # Lightnet functions
    "query_hashes",
    "get_database_stats",
    "get_latest_hashes",
    "get_tables",
    "get_table_schema",
    "browse_table",
    "get_record",
    "get_record_with_prev_hash",
    "get_record_by_data_item",
    "verify_hash",
    "compute_hash_from_hex",
    "send_single_grpc_request",
    "get_merkle_proof",
    "verify_hash_existence",
    "verify_hash_batch",
    # Types
    "ProveSingleHashResponse",
    "GetRecordResponse",
    "GetRecordByDataItemResponse",
    "VerifyResult",
    "VerifyRequest",
    "VerifyWithInclusionRequest",
    "VerifyLevelCheck",
    "NormalizedKayrosRecord",
    "NormalizedMerkleProof",
    "MerkleProofInput",
    "MerkleProofLevel",
    "MerkleProofCompatibilityMismatch",
    "MerkleProofCompatibilityResult",
    "LevelCheckResult",
    "BatchExistenceCheckResult",
    "DatabaseQuery",
    "HashRecord",
    "DatabaseStats",
    "ColumnInfo",
    "TableBrowseRequest",
    "DatabaseRecord",
    "HashVerifyRequest",
    "HashVerifyResult",
    "ComputeHashRequest",
    "ComputeHashResponse",
    "HashExistenceRequest",
    "HashExistenceResponse",
    "HashBatchRequest",
    "HashBatchResponse",
    "SingleHashRequest",
    "SingleHashResponse",
    "MerkleProofResponse",
    "APIResponse",
    # Config
    "KAYROS_HOST",
    "API_ROUTES",
    "DATA_TYPE",
    "DEFAULT_API_KEY",
    "DEFAULT_USER_KEY",
    "get_api_key",
    "get_kayros_url",
    "get_record_url",
    "set_api_key",
    "set_user_key",
    "get_user_key",
]
