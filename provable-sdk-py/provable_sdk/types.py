"""
Provable SDK Types
"""

from typing import TypedDict, Generic, TypeVar, Optional, Any, Dict

T = TypeVar('T')


class KayrosTimestamp(TypedDict, total=False):
    service: str
    response: Any


class KayrosMetadata(TypedDict, total=False):
    hash: str
    hashAlgorithm: str
    timestamp: KayrosTimestamp


class KayrosEnvelope(TypedDict, Generic[T]):
    data: T
    kayros: KayrosMetadata


class ProveSingleHashResponseData(TypedDict):
    computed_hash_hex: str


class ProveSingleHashResponse(TypedDict):
    data: ProveSingleHashResponseData


class GetRecordResponseData(TypedDict, total=False):
    data_item_hex: str
    timestamp: str


class GetRecordResponse(TypedDict):
    data: GetRecordResponseData


class VerifyResultDetails(TypedDict, total=False):
    hashMatch: bool
    remoteMatch: bool
    computedHash: str
    envelopeHash: str
    remoteHash: str


class VerifyResult(TypedDict, total=False):
    valid: bool
    error: Optional[str]
    details: VerifyResultDetails
