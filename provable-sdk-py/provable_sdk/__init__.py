"""
Provable SDK for Python
"""

from .hash import hash, keccak256, hash_str, keccak256_str, sha256, sha256_str
from .api import prove_single_hash, get_record_by_hash
from .prove import prove_data, prove_data_str
from .verify import verify
from .lightnet import (
    query_hashes,
    get_database_stats,
    get_latest_hashes,
    get_tables,
    get_table_schema,
    browse_table,
    get_record,
    get_record_with_prev_hash,
    verify_hash,
    compute_hash_from_hex,
    send_single_grpc_request,
    generate_merkle_proof,
    verify_merkle_proof,
)
from .types import (
    KayrosMetadata,
    KayrosEnvelope,
    ProveSingleHashResponse,
    GetRecordResponse,
    VerifyResult,
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
    # gRPC types
    SingleHashRequest,
    SingleHashResponse,
    # Merkle proof types
    GenerateMerkleProofRequest,
    MerkleProof,
    VerifyMerkleProofRequest,
    MerkleProofVerificationResult,
    # API Response wrapper
    APIResponse,
)
from .config import KAYROS_HOST, API_ROUTES, DATA_TYPE, get_kayros_url, get_record_url

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
    # Lightnet functions
    "query_hashes",
    "get_database_stats",
    "get_latest_hashes",
    "get_tables",
    "get_table_schema",
    "browse_table",
    "get_record",
    "get_record_with_prev_hash",
    "verify_hash",
    "compute_hash_from_hex",
    "send_single_grpc_request",
    "generate_merkle_proof",
    "verify_merkle_proof",
    # Types
    "KayrosMetadata",
    "KayrosEnvelope",
    "ProveSingleHashResponse",
    "GetRecordResponse",
    "VerifyResult",
    "DatabaseQuery",
    "HashRecord",
    "DatabaseStats",
    "ColumnInfo",
    "TableBrowseRequest",
    "DatabaseRecord",
    "HashVerifyRequest",
    "HashVerifyResult",
    "ComputeHashRequest",
    "SingleHashRequest",
    "SingleHashResponse",
    "GenerateMerkleProofRequest",
    "MerkleProof",
    "VerifyMerkleProofRequest",
    "MerkleProofVerificationResult",
    "APIResponse",
    # Config
    "KAYROS_HOST",
    "API_ROUTES",
    "DATA_TYPE",
    "get_kayros_url",
    "get_record_url",
]
