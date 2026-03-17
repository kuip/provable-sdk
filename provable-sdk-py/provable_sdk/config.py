"""
Provable SDK Configuration
"""

KAYROS_HOST = "https://kayros.provable.dev"

API_ROUTES = {
    "PROVE_SINGLE_HASH": "/api/lightnet/grpc/single-hash",
    "GET_RECORD_BY_HASH": "/api/lightnet/database/record-by-hash",
    "GET_RECORD_BY_DATA_ITEM": "/api/lightnet/database/record",
    "COMPUTE_HASH_FROM_HEX": "/api/lightnet/compute-hash-from-hex",
    "GET_MERKLE_PROOF": "/api/lightnet/merkle-proof",
    "VERIFY_HASH_EXISTENCE": "/api/lightnet/merkle/verify-hash-existence",
    "VERIFY_HASH_BATCH": "/api/lightnet/merkle/verify-hash-batch",
}

# Default data type for new writes and lookups.
DATA_TYPE = "provable_sdk"
DEFAULT_USER_KEY = "0x0000000000000000000000000000000000000000000000000000000000000001"
DEFAULT_API_KEY = DEFAULT_USER_KEY

_api_key = DEFAULT_API_KEY


def get_kayros_url(route: str) -> str:
    """Build full Kayros API URL from route"""
    return KAYROS_HOST + route


def set_user_key(key: str) -> None:
    """Set user key used in X-User-Key header."""
    global _api_key
    _api_key = key


def get_user_key() -> str:
    """Get current user key used in X-User-Key header."""
    return _api_key


def set_api_key(key: str) -> None:
    """Set API key used in X-User-Key header."""
    set_user_key(key)


def get_api_key() -> str:
    """Get current API key used in X-User-Key header."""
    return get_user_key()


def resolve_api_key(api_key: str = None) -> str:
    """Resolve an explicit API key override or fallback to the configured default."""
    return api_key if api_key is not None else get_api_key()


def get_default_headers(api_key: str = None) -> dict:
    """Get default request headers for Kayros API."""
    return {
        "Content-Type": "application/json",
        "X-User-Key": resolve_api_key(api_key),
    }


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
