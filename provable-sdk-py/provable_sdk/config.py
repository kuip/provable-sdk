"""
Provable SDK Configuration
"""

KAYROS_HOST = "https://kayros.provable.dev"

API_ROUTES = {
    "PROVE_SINGLE_HASH": "/api/grpc/single-hash",
    "GET_RECORD_BY_HASH": "/api/database/record-by-hash",
}

DATA_TYPE = "70726f7661626c655f666f726d73000000000000000000000000000000000000"


def get_kayros_url(route: str) -> str:
    """Build full Kayros API URL from route"""
    return KAYROS_HOST + route
