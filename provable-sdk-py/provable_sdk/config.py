"""
Provable SDK Configuration
"""

KAYROS_HOST = "https://kayros.provable.dev"
# KAYROS_HOST = "http://localhost:3001"

API_ROUTES = {
    "PROVE_SINGLE_HASH": "/api/lightnet/grpc/single-hash",
    "GET_RECORD_BY_HASH": "/api/lightnet/database/record-by-hash",
}

# Default data type (provable_sdk padded to 32 bytes)
DATA_TYPE = "provable_sdk\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"


def get_kayros_url(route: str) -> str:
    """Build full Kayros API URL from route"""
    return KAYROS_HOST + route


def get_record_url(hash: str, data_type: str = DATA_TYPE) -> str:
    """
    Get the URL to view a record on Kayros by its hash

    Args:
        hash: The hash to look up

    Returns:
        The full URL to view the record
    """
    return (
        f"{KAYROS_HOST}{API_ROUTES['GET_RECORD_BY_HASH']}?hash={format_hash_for_query(hash)}"
        f"&data_type={format_data_type_for_query(data_type)}"
    )


def format_data_type_for_query(data_type: str) -> str:
    """
    Format data type for Kayros query params (pad to 32 bytes with nulls).
    """
    from urllib.parse import quote
    return quote(data_type, safe="")


def format_hash_for_query(hash_value: str) -> str:
    """
    Format hash for Kayros query params (base64 when input is 64-hex).
    """
    import re
    import base64
    from urllib.parse import quote

    if re.fullmatch(r"[0-9a-fA-F]{64}", hash_value or ""):
        raw = bytes.fromhex(hash_value)
        return quote(base64.b64encode(raw))
    return quote(hash_value)
