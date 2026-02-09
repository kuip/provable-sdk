"""
Kayros API client
"""

import requests
from typing import Any, Dict

from .config import (
    get_kayros_url,
    API_ROUTES,
    DATA_TYPE,
    format_data_type_for_query,
    format_hash_for_query,
    get_default_headers,
)
from .types import ProveSingleHashResponse, GetRecordResponse


def prove_single_hash(data_hash: str, data_type: str = None) -> ProveSingleHashResponse:
    """
    Call Kayros API to prove a single hash

    Args:
        data_hash: The hash to prove (hex string)
        data_type: Optional data type identifier (defaults to "provable_sdk" padded to 32 bytes)

    Returns:
        The Kayros response

    Raises:
        requests.HTTPError: If the API request fails
    """
    dt = data_type if data_type is not None else DATA_TYPE

    url = get_kayros_url(API_ROUTES["PROVE_SINGLE_HASH"])

    response = requests.post(
        url,
        json={
            "data_item": data_hash,
            "data_type": dt,
        },
        headers=get_default_headers(),
    )

    response.raise_for_status()
    return response.json()


def get_record_by_hash(record_hash: str, data_type: str = None) -> GetRecordResponse:
    """
    Get a Kayros record by hash

    Args:
        record_hash: The hash of the record to retrieve

    Returns:
        The record data

    Raises:
        requests.HTTPError: If the API request fails
    """
    dt = data_type if data_type is not None else DATA_TYPE

    url = get_kayros_url(
        f"{API_ROUTES['GET_RECORD_BY_HASH']}?hash={format_hash_for_query(record_hash)}"
        f"&data_type={format_data_type_for_query(dt)}"
    )

    response = requests.get(
        url,
        headers=get_default_headers(),
    )

    response.raise_for_status()
    return response.json()
