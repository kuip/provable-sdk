"""
Provable SDK Configuration
"""

KAYROS_HOST = "https://kayros.provable.dev"

API_ROUTES = {
    "PROVE_SINGLE_HASH": "/api/grpc/single-hash",
    "GET_RECORD_BY_HASH": "/api/database/record-by-hash",
}

# "provable_sdk" (0x70726f7661626c655f73646b) padded to 32 bytes
DATA_TYPE = "70726f7661626c655f73646b00000000000000000000000000000000000000000000"


def get_kayros_url(route: str) -> str:
    """Build full Kayros API URL from route"""
    return KAYROS_HOST + route


def validate_data_type(data_type: str) -> None:
    """
    Validates that a data type is exactly 32 bytes (64 hex characters)

    Args:
        data_type: The data type to validate

    Raises:
        ValueError: If data type is not exactly 64 hex characters
    """
    if len(data_type) != 64:
        raise ValueError(f"data_type must be exactly 64 hex characters (32 bytes), got {len(data_type)} characters")

    import re
    if not re.match(r'^[0-9a-fA-F]{64}$', data_type):
        raise ValueError("data_type must contain only valid hex characters (0-9, a-f, A-F)")
