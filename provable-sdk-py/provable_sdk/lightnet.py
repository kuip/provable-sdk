"""
Lightnet API client - Database, Hash, and Merkle operations
"""

import requests
from typing import Any, Dict, List
from urllib.parse import urlencode

from .config import get_kayros_url
from .types import (
    APIResponse,
    DatabaseQuery,
    HashRecord,
    DatabaseStats,
    ColumnInfo,
    TableBrowseRequest,
    DatabaseRecord,
    HashVerifyRequest,
    HashVerifyResult,
    ComputeHashRequest,
    SingleHashRequest,
    SingleHashResponse,
    GenerateMerkleProofRequest,
    MerkleProof,
    VerifyMerkleProofRequest,
    MerkleProofVerificationResult,
)


# Database Operations

def query_hashes(query: DatabaseQuery) -> APIResponse:
    """
    Query hash records from the database

    Args:
        query: Database query parameters

    Returns:
        API response with hash records

    Raises:
        requests.HTTPError: If the API request fails
    """
    url = get_kayros_url('/api/database/query')
    response = requests.post(url, json=query, headers={'Content-Type': 'application/json'})
    response.raise_for_status()
    return response.json()


def get_database_stats() -> APIResponse:
    """
    Get database statistics

    Returns:
        API response with database stats

    Raises:
        requests.HTTPError: If the API request fails
    """
    url = get_kayros_url('/api/database/stats')
    response = requests.get(url, headers={'Content-Type': 'application/json'})
    response.raise_for_status()
    return response.json()


def get_latest_hashes(limit: int = 50) -> APIResponse:
    """
    Get the most recent hash records

    Args:
        limit: Number of records to retrieve (default 50)

    Returns:
        API response with latest hash records

    Raises:
        requests.HTTPError: If the API request fails
    """
    url = get_kayros_url(f'/api/database/latest?limit={limit}')
    response = requests.get(url, headers={'Content-Type': 'application/json'})
    response.raise_for_status()
    return response.json()


def get_tables() -> APIResponse:
    """
    Get all database tables

    Returns:
        API response with table names

    Raises:
        requests.HTTPError: If the API request fails
    """
    url = get_kayros_url('/api/database/tables')
    response = requests.get(url, headers={'Content-Type': 'application/json'})
    response.raise_for_status()
    return response.json()


def get_table_schema(table_name: str) -> APIResponse:
    """
    Get schema for a specific table

    Args:
        table_name: Name of the table

    Returns:
        API response with column information

    Raises:
        requests.HTTPError: If the API request fails
    """
    url = get_kayros_url(f'/api/database/schema?table={requests.utils.quote(table_name)}')
    response = requests.get(url, headers={'Content-Type': 'application/json'})
    response.raise_for_status()
    return response.json()


def browse_table(request: TableBrowseRequest) -> APIResponse:
    """
    Browse table data with pagination

    Args:
        request: Table browse parameters

    Returns:
        API response with table rows

    Raises:
        requests.HTTPError: If the API request fails
    """
    url = get_kayros_url('/api/database/browse')
    response = requests.post(url, json=request, headers={'Content-Type': 'application/json'})
    response.raise_for_status()
    return response.json()


def get_record(uuid: str) -> APIResponse:
    """
    Get a record by UUID

    Args:
        uuid: Record UUID (hex string)

    Returns:
        API response with database record

    Raises:
        requests.HTTPError: If the API request fails
    """
    url = get_kayros_url(f'/api/database/record?uuid={requests.utils.quote(uuid)}')
    response = requests.get(url, headers={'Content-Type': 'application/json'})
    response.raise_for_status()
    return response.json()


def get_record_with_prev_hash(uuid: str) -> APIResponse:
    """
    Get a record by UUID with previous hash

    Args:
        uuid: Record UUID (hex string)

    Returns:
        API response with database record including prev_hash

    Raises:
        requests.HTTPError: If the API request fails
    """
    url = get_kayros_url(f'/api/database/record-with-prev?uuid={requests.utils.quote(uuid)}')
    response = requests.get(url, headers={'Content-Type': 'application/json'})
    response.raise_for_status()
    return response.json()


# Hash Operations

def verify_hash(request: HashVerifyRequest) -> APIResponse:
    """
    Verify a hash computation

    Args:
        request: Hash verification request

    Returns:
        API response with hash verification result

    Raises:
        requests.HTTPError: If the API request fails
    """
    url = get_kayros_url('/api/verify-hash')
    response = requests.post(url, json=request, headers={'Content-Type': 'application/json'})
    response.raise_for_status()
    return response.json()


def compute_hash_from_hex(request: ComputeHashRequest) -> APIResponse:
    """
    Compute hash from hex input

    Args:
        request: Compute hash request

    Returns:
        API response with computed hash result

    Raises:
        requests.HTTPError: If the API request fails
    """
    url = get_kayros_url('/api/compute-hash-from-hex')
    response = requests.post(url, json=request, headers={'Content-Type': 'application/json'})
    response.raise_for_status()
    return response.json()


# gRPC Operations

def send_single_grpc_request(request: SingleHashRequest) -> APIResponse:
    """
    Send a single gRPC request to Lightnet

    Args:
        request: Single hash request with data_type and data_item

    Returns:
        API response with gRPC response

    Raises:
        requests.HTTPError: If the API request fails
    """
    url = get_kayros_url('/api/grpc/single-hash')
    response = requests.post(url, json=request, headers={'Content-Type': 'application/json'})
    response.raise_for_status()
    return response.json()


# Merkle Proof Operations

def generate_merkle_proof(request: GenerateMerkleProofRequest) -> APIResponse:
    """
    Generate a Merkle proof for a specific hash

    Args:
        request: Merkle proof generation request

    Returns:
        API response with Merkle proof

    Raises:
        requests.HTTPError: If the API request fails
    """
    url = get_kayros_url('/api/merkle/generate-proof')
    response = requests.post(url, json=request, headers={'Content-Type': 'application/json'})
    response.raise_for_status()
    return response.json()


def verify_merkle_proof(request: VerifyMerkleProofRequest) -> APIResponse:
    """
    Verify a Merkle proof

    Args:
        request: Merkle proof verification request

    Returns:
        API response with verification result

    Raises:
        requests.HTTPError: If the API request fails
    """
    url = get_kayros_url('/api/merkle/verify-proof')
    response = requests.post(url, json=request, headers={'Content-Type': 'application/json'})
    response.raise_for_status()
    return response.json()
