"""
Lightnet API client - Database, Hash, and Merkle operations
"""

import requests
from typing import Any, Dict, List
from urllib.parse import urlencode

from .config import get_kayros_url, API_ROUTES, get_default_headers
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
    ComputeHashResponse,
    SingleHashRequest,
    SingleHashResponse,
    GetRecordByDataItemResponse,
    MerkleProofResponse,
    HashExistenceRequest,
    HashExistenceResponse,
    HashBatchRequest,
    HashBatchResponse,
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
    response = requests.post(url, json=query, headers=get_default_headers())
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
    response = requests.get(url, headers=get_default_headers())
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
    response = requests.get(url, headers=get_default_headers())
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
    response = requests.get(url, headers=get_default_headers())
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
    response = requests.get(url, headers=get_default_headers())
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
    response = requests.post(url, json=request, headers=get_default_headers())
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
    response = requests.get(url, headers=get_default_headers())
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
    response = requests.get(url, headers=get_default_headers())
    response.raise_for_status()
    return response.json()


def get_record_by_data_item(data_type: str, data_item: str, api_key: str = None, limit: int = None) -> GetRecordByDataItemResponse:
    """
    Get records by data_type and data_item.
    """
    params = {
        "data_type": data_type,
        "data_item": data_item,
    }
    if limit is not None and limit > 0:
        params["limit"] = limit

    url = get_kayros_url(f"{API_ROUTES['GET_RECORD_BY_DATA_ITEM']}?{urlencode(params)}")
    response = requests.get(url, headers=get_default_headers(api_key))
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
    response = requests.post(url, json=request, headers=get_default_headers())
    response.raise_for_status()
    return response.json()


def compute_hash_from_hex(request: ComputeHashRequest, api_key: str = None) -> ComputeHashResponse:
    """
    Compute hash from hex input

    Args:
        request: Compute hash request

    Returns:
        API response with computed hash result

    Raises:
        requests.HTTPError: If the API request fails
    """
    url = get_kayros_url(API_ROUTES["COMPUTE_HASH_FROM_HEX"])
    response = requests.post(url, json=request, headers=get_default_headers(api_key))
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
    url = get_kayros_url(API_ROUTES["PROVE_SINGLE_HASH"])
    response = requests.post(url, json=request, headers=get_default_headers())
    response.raise_for_status()
    return response.json()


# Merkle Proof Operations

def get_merkle_proof(data_type: str, *, hash: str = None, position: int = None, api_key: str = None) -> MerkleProofResponse:
    """
    Get a Merkle proof by hash or position.
    """
    params: Dict[str, Any] = {"data_type": data_type}
    if hash is not None:
        params["hash"] = hash
    if position is not None:
        params["position"] = position

    url = get_kayros_url(f"{API_ROUTES['GET_MERKLE_PROOF']}?{urlencode(params)}")
    response = requests.get(url, headers=get_default_headers(api_key))
    response.raise_for_status()
    return response.json()


def verify_hash_existence(request: HashExistenceRequest, api_key: str = None) -> HashExistenceResponse:
    """
    Verify that a hash exists at a specific level and position.
    """
    url = get_kayros_url(API_ROUTES["VERIFY_HASH_EXISTENCE"])
    response = requests.post(url, json=request, headers=get_default_headers(api_key))
    response.raise_for_status()
    return response.json()


def verify_hash_batch(request: HashBatchRequest, api_key: str = None) -> HashBatchResponse:
    """
    Verify multiple hashes at once for a level/start window.
    """
    url = get_kayros_url(API_ROUTES["VERIFY_HASH_BATCH"])
    response = requests.post(url, json=request, headers=get_default_headers(api_key))
    response.raise_for_status()
    return response.json()
