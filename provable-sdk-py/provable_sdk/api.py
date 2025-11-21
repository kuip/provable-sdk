"""
Kayros API client
"""

import requests
from typing import Any, Dict

from .config import get_kayros_url, API_ROUTES, DATA_TYPE
from .types import ProveSingleHashResponse, GetRecordResponse


def prove_single_hash(data_hash: str) -> ProveSingleHashResponse:
    """
    Call Kayros API to prove a single hash

    Args:
        data_hash: The hash to prove (hex string)

    Returns:
        The Kayros response

    Raises:
        requests.HTTPError: If the API request fails
    """
    url = get_kayros_url(API_ROUTES["PROVE_SINGLE_HASH"])

    response = requests.post(
        url,
        json={
            "data_item": data_hash,
            "data_type": DATA_TYPE,
        },
        headers={"Content-Type": "application/json"},
    )

    response.raise_for_status()
    return response.json()


def get_record_by_hash(record_hash: str) -> GetRecordResponse:
    """
    Get a Kayros record by hash

    Args:
        record_hash: The hash of the record to retrieve

    Returns:
        The record data

    Raises:
        requests.HTTPError: If the API request fails
    """
    url = get_kayros_url(f"{API_ROUTES['GET_RECORD_BY_HASH']}?hash_item={record_hash}")

    response = requests.get(
        url,
        headers={"Content-Type": "application/json"},
    )

    response.raise_for_status()
    return response.json()
