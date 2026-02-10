"""
Provable SDK Types
"""

import base64
import json
from typing import TypedDict, Optional, Any, Dict, List

from .hash import keccak256, sha256

class KayrosTimestamp(TypedDict, total=False):
    service: str
    response: Any


class KayrosMetadataV0Data(TypedDict, total=False):
    """Data field in V0 format (from APIResponse)"""
    data_item_hex: str
    computed_hash_hex: str
    data_type: str
    data_type_hex: str
    message: str
    success: bool
    timeuuid_hex: str


class KayrosMetadata(TypedDict, total=False):
    """V1 format metadata"""
    hash: str
    hashAlgorithm: str
    timestamp: KayrosTimestamp


class KayrosMetadataV0(TypedDict, total=False):
    """V0 format metadata (APIResponse-based)"""
    success: bool
    message: str
    data: KayrosMetadataV0Data
    error: str
    hash: str
    hashAlgorithm: str


class GetRecordResponse(TypedDict, total=False):
    data_item: str
    data_type: str
    hash_item: str
    hash_type: str
    position: int
    prev_hash: str
    ts: str


class KayrosEnvelope:
    """Kayros envelope with data and proof metadata"""

    def __init__(self, data: Any, kayros: Dict[str, Any], raw_data_json: Optional[str] = None):
        self.data = data
        self.kayros = kayros
        self.raw_data_json = raw_data_json

    @classmethod
    def from_json(cls, payload: str) -> "KayrosEnvelope":
        parsed = json.loads(payload)
        if not isinstance(parsed, dict) or "data" not in parsed or "kayros" not in parsed:
            raise ValueError('Invalid proof JSON: expected object with "data" and "kayros"')
        raw_data_json = cls._extract_top_level_property_value(payload, "data")
        return cls(parsed["data"], parsed["kayros"], raw_data_json=raw_data_json)

    @staticmethod
    def _as_dict(value: Any) -> Optional[Dict[str, Any]]:
        return value if isinstance(value, dict) else None

    @staticmethod
    def _first_non_empty_string(*values: Any) -> Optional[str]:
        for value in values:
            if isinstance(value, str) and value != "":
                return value
        return None

    @staticmethod
    def _decode_hex_string(value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        normalized = value[2:] if value.startswith("0x") else value
        if len(normalized) == 0 or len(normalized) % 2 != 0:
            return None
        try:
            raw = bytes.fromhex(normalized)
        except ValueError:
            return None
        try:
            return raw.decode("utf-8")
        except UnicodeDecodeError:
            return raw.decode("utf-8", errors="ignore")

    @staticmethod
    def _get_path(root: Optional[Dict[str, Any]], path: List[str]) -> Any:
        current: Any = root
        for segment in path:
            if not isinstance(current, dict) or segment not in current:
                return None
            current = current[segment]
        return current

    def _timestamp_response(self) -> Optional[Dict[str, Any]]:
        timestamp = self._as_dict(self.kayros.get("timestamp"))
        if not timestamp:
            return None
        return self._as_dict(timestamp.get("response"))

    def _register_response(self) -> Optional[Dict[str, Any]]:
        timestamp_response = self._timestamp_response()
        if not timestamp_response:
            return None
        nested = self._as_dict(timestamp_response.get("response"))
        return nested if nested is not None else timestamp_response

    def _metadata_kind(self) -> str:
        if self._timestamp_response() is not None:
            return "timestamp_v1"
        if isinstance(self.kayros.get("data"), dict):
            return "legacy_v0"
        return "unknown"

    def _get_metadata_data(self) -> Optional[Dict[str, Any]]:
        """Get the data dict from metadata (V0 or V1 timestamp response)"""
        if isinstance(self.kayros.get("data"), dict):
            return self.kayros["data"]
        register = self._register_response()
        if isinstance(register, dict) and isinstance(register.get("data"), dict):
            return register.get("data")
        timestamp = self._timestamp_response()
        if isinstance(timestamp, dict) and isinstance(timestamp.get("data"), dict):
            return timestamp.get("data")
        return None

    @staticmethod
    def _normalize_hash_algorithm(value: Optional[str]) -> str:
        if not value:
            return "sha256"
        normalized = value.lower().replace("_", "").replace("-", "")
        return "keccak256" if normalized == "keccak256" else "sha256"

    @staticmethod
    def _safe_base64_decode(value: str) -> Optional[bytes]:
        if value is None:
            return None
        try:
            return base64.b64decode(value, validate=True)
        except Exception:
            try:
                return base64.urlsafe_b64decode(value)
            except Exception:
                return None

    @staticmethod
    def _unique_strings(values: List[Optional[str]]) -> List[str]:
        seen = set()
        out: List[str] = []
        for value in values:
            if not value or value in seen:
                continue
            seen.add(value)
            out.append(value)
        return out

    @staticmethod
    def _skip_ws(text: str, index: int) -> int:
        i = index
        while i < len(text) and text[i].isspace():
            i += 1
        return i

    @staticmethod
    def _read_json_string_token(text: str, start: int) -> Optional[tuple[str, int]]:
        if start >= len(text) or text[start] != '"':
            return None
        i = start + 1
        escaped = False
        while i < len(text):
            ch = text[i]
            if escaped:
                escaped = False
                i += 1
                continue
            if ch == "\\":
                escaped = True
                i += 1
                continue
            if ch == '"':
                raw = text[start:i + 1]
                return json.loads(raw), i + 1
            i += 1
        return None

    @staticmethod
    def _read_json_value_end(text: str, start: int) -> Optional[int]:
        if start >= len(text):
            return None
        first = text[start]
        if first == '"':
            token = KayrosEnvelope._read_json_string_token(text, start)
            return token[1] if token else None
        if first in "{[":
            stack = [first]
            i = start + 1
            in_string = False
            escaped = False
            while i < len(text):
                ch = text[i]
                if in_string:
                    if escaped:
                        escaped = False
                    elif ch == "\\":
                        escaped = True
                    elif ch == '"':
                        in_string = False
                    i += 1
                    continue
                if ch == '"':
                    in_string = True
                    i += 1
                    continue
                if ch in "{[":
                    stack.append(ch)
                    i += 1
                    continue
                if ch in "}]":
                    opener = stack.pop() if stack else None
                    if opener is None:
                        return None
                    if not ((opener == "{" and ch == "}") or (opener == "[" and ch == "]")):
                        return None
                    i += 1
                    if not stack:
                        return i
                    continue
                i += 1
            return None
        i = start
        while i < len(text) and text[i] not in ",}]":
            i += 1
        end = i
        while end > start and text[end - 1].isspace():
            end -= 1
        return end

    @staticmethod
    def _extract_top_level_property_value(text: str, property_name: str) -> Optional[str]:
        i = KayrosEnvelope._skip_ws(text, 0)
        if i >= len(text) or text[i] != "{":
            return None
        i += 1
        while i < len(text):
            i = KayrosEnvelope._skip_ws(text, i)
            if i < len(text) and text[i] == "}":
                return None
            key = KayrosEnvelope._read_json_string_token(text, i)
            if not key:
                return None
            key_name, i = key
            i = KayrosEnvelope._skip_ws(text, i)
            if i >= len(text) or text[i] != ":":
                return None
            i += 1
            i = KayrosEnvelope._skip_ws(text, i)
            value_start = i
            value_end = KayrosEnvelope._read_json_value_end(text, i)
            if value_end is None:
                return None
            if key_name == property_name:
                return text[value_start:value_end]
            i = KayrosEnvelope._skip_ws(text, value_end)
            if i < len(text) and text[i] == ",":
                i += 1
                continue
            if i < len(text) and text[i] == "}":
                return None
            return None

    def get_data_hash(self) -> Optional[str]:
        """Get the data hash (data_item_hex) from the metadata"""
        register = self._register_response()
        timestamp = self._timestamp_response()
        metadata_data = self._get_metadata_data()
        return self._first_non_empty_string(
            self.kayros.get("hash"),
            self._get_path(register, ["data_item_hex"]),
            self._get_path(register, ["data", "data_item_hex"]),
            self._get_path(timestamp, ["data", "data_item_hex"]),
            metadata_data.get("data_item_hex") if isinstance(metadata_data, dict) else None,
        )

    def get_data_type(self) -> Optional[str]:
        """Get data_type from metadata. Prefer raw data_type, fallback to decoded data_type_hex."""
        register = self._register_response()
        timestamp = self._timestamp_response()
        metadata_data = self._get_metadata_data()
        raw = self._first_non_empty_string(
            self._get_path(register, ["data_type"]),
            self._get_path(register, ["data", "data_type"]),
            self._get_path(timestamp, ["data", "data_type"]),
            metadata_data.get("data_type") if isinstance(metadata_data, dict) else None,
        )
        if raw:
            return raw
        hex_value = self._first_non_empty_string(
            self._get_path(register, ["data_type_hex"]),
            self._get_path(register, ["data", "data_type_hex"]),
            self._get_path(timestamp, ["data", "data_type_hex"]),
            metadata_data.get("data_type_hex") if isinstance(metadata_data, dict) else None,
        )
        if not hex_value:
            return None
        return self._decode_hex_string(hex_value) or hex_value

    def get_data_type_label(self) -> Optional[str]:
        data_type = self.get_data_type()
        if not data_type:
            return None
        return self._decode_hex_string(data_type) or data_type

    def get_data_type_lookup_candidates(self) -> List[str]:
        register = self._register_response()
        timestamp = self._timestamp_response()
        metadata_data = self._get_metadata_data()
        raw = self._first_non_empty_string(
            self._get_path(register, ["data_type"]),
            self._get_path(register, ["data", "data_type"]),
            self._get_path(timestamp, ["data", "data_type"]),
            metadata_data.get("data_type") if isinstance(metadata_data, dict) else None,
        )
        decoded_raw = self._decode_hex_string(raw)
        data_type = self.get_data_type()
        decoded_data_type = self._decode_hex_string(data_type)
        label = self.get_data_type_label()
        return self._unique_strings([raw, decoded_raw, data_type, decoded_data_type, label])

    def get_kayros_hash(self) -> Optional[str]:
        """Get the Kayros hash (computed_hash_hex) from the metadata"""
        register = self._register_response()
        timestamp = self._timestamp_response()
        metadata_data = self._get_metadata_data()
        return self._first_non_empty_string(
            metadata_data.get("computed_hash_hex") if isinstance(metadata_data, dict) else None,
            self._get_path(timestamp, ["data", "computed_hash_hex"]),
            self._get_path(register, ["data", "computed_hash_hex"]),
            self._get_path(register, ["computed_hash_hex"]),
            self._get_path(register, ["hash"]),
        )

    def get_time_uuid(self) -> Optional[str]:
        """Get the time UUID (timeuuid_hex) from the metadata"""
        register = self._register_response()
        timestamp = self._timestamp_response()
        metadata_data = self._get_metadata_data()
        return self._first_non_empty_string(
            self._get_path(register, ["data", "timeuuid_hex"]),
            self._get_path(register, ["timeuuid_hex"]),
            self._get_path(register, ["data", "timeuuid"]),
            self._get_path(register, ["timeuuid"]),
            self._get_path(timestamp, ["data", "timeuuid_hex"]),
            self._get_path(timestamp, ["data", "timeuuid"]),
            metadata_data.get("timeuuid_hex") if isinstance(metadata_data, dict) else None,
        )

    def get_hash_algorithm(self) -> str:
        """Get the hash algorithm (normalized to lowercase, defaults to sha256)"""
        return self._normalize_hash_algorithm(self.kayros.get("hashAlgorithm"))

    def is_v0(self) -> bool:
        """Check if this is the V0 format (legacy, used only for email proofs).
        V0 envelopes have base64-encoded data that must be decoded before hashing."""
        return (
            self._metadata_kind() == "legacy_v0"
            and not self.kayros.get("hash")
            and isinstance(self.kayros.get("data"), dict)
            and bool(self.kayros["data"].get("data_item_hex"))
        )

    def _primary_data_bytes(self) -> bytes:
        if isinstance(self.data, str):
            if self._metadata_kind() == "legacy_v0":
                decoded = self._safe_base64_decode(self.data)
                if decoded is not None:
                    return decoded
            return self.data.encode("utf-8")
        if isinstance(self.raw_data_json, str):
            return self.raw_data_json.encode("utf-8")
        return json.dumps(self.data, separators=(",", ":"), ensure_ascii=False).encode("utf-8")

    def _data_byte_candidates(self) -> List[bytes]:
        seen = set()
        candidates: List[bytes] = []

        def add(value: Optional[bytes]) -> None:
            if not value:
                return
            key = value.hex()
            if key in seen:
                return
            seen.add(key)
            candidates.append(value)

        if isinstance(self.data, str):
            utf8 = self.data.encode("utf-8")
            decoded = self._safe_base64_decode(self.data)
            if self._metadata_kind() == "legacy_v0":
                add(decoded)
                add(utf8)
            else:
                add(utf8)
                add(decoded)
            return candidates

        if isinstance(self.raw_data_json, str):
            add(self.raw_data_json.encode("utf-8"))
        add(json.dumps(self.data, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
        return candidates

    def get_data(self) -> bytes:
        """Get the primary data bytes used for hashing."""
        return self._primary_data_bytes()

    @staticmethod
    def _hash_bytes(data: bytes, algorithm: str) -> str:
        if algorithm == "keccak256":
            return keccak256(data)
        return sha256(data)

    def compute_data_hash(self) -> str:
        """Compute the data hash using the envelope hash algorithm."""
        expected = (self.get_data_hash() or "").lower()
        preferred = self.get_hash_algorithm()
        alternate = "sha256" if preferred == "keccak256" else "keccak256"
        candidates = self._data_byte_candidates()

        if expected:
            for candidate in candidates:
                preferred_hash = self._hash_bytes(candidate, preferred).lower()
                if preferred_hash == expected:
                    return preferred_hash
                alternate_hash = self._hash_bytes(candidate, alternate).lower()
                if alternate_hash == expected:
                    return alternate_hash

        primary = self._primary_data_bytes()
        return self._hash_bytes(primary, preferred).lower()


class ProveSingleHashResponse(TypedDict, total=False):
    success: bool
    hash: str
    timeuuid: str
    encoding: str
    error: str


class GetRecordResponse(TypedDict, total=False):
    data: Dict[str, Any]
    data_item_hex: str
    timestamp: str


class VerifyResultDetails(TypedDict, total=False):
    hashMatch: bool
    remoteMatch: bool
    computedHash: str
    dataHash: str
    remoteHash: str


class VerifyResult(TypedDict, total=False):
    valid: bool
    error: Optional[str]
    details: VerifyResultDetails


# Database types
class DatabaseQuery(TypedDict, total=False):
    data_type: Optional[str]
    hash_type: Optional[str]
    min_timestamp: Optional[str]
    max_timestamp: Optional[str]
    limit: int
    offset: int
    order_by: str  # ts_asc or ts_desc


class HashRecord(TypedDict):
    timestamp: str
    data_type: str
    data_item: str  # base64 or hex
    hash_type: str
    hash_item: str  # base64 or hex


class DatabaseStats(TypedDict):
    total_hashes: int
    count_by_type: Dict[str, int]
    min_timestamp: str
    max_timestamp: str
    timestamp_range: str


class ColumnInfo(TypedDict):
    name: str
    type: str


class TableBrowseRequest(TypedDict, total=False):
    table_name: str
    offset: int
    limit: int
    order_by: Optional[str]
    search_term: Optional[str]
    search_column: Optional[str]


class DatabaseRecord(TypedDict, total=False):
    data_type: str
    data_item_hex: str
    uuid_hex: str
    hash_item_hex: str
    prev_hash_hex: Optional[str]
    hash_type: str
    timestamp: str


# Hash verification types
class HashVerifyRequest(TypedDict):
    prev_hash: str  # hex
    data_type: str
    data_item: str  # hex
    uuid: str  # hex
    hash_type: str  # blake3 or xxh3


class HashVerifyResult(TypedDict):
    computed_hash: str  # hex
    hash_input_hex: str


class ComputeHashRequest(TypedDict):
    hash_input_hex: str
    hash_type: str  # blake3 or xxh3


# gRPC types
class SingleHashRequest(TypedDict):
    data_type: str  # 64 hex chars (32 bytes)
    data_item: str  # 64 hex chars (32 bytes)


class SingleHashResponse(TypedDict):
    success: bool
    message: str
    data_type: str
    data_item: str
    computed_hash_hex: str
    timeuuid_hex: str
    data_type_hex: str
    data_item_hex: str


# Merkle proof types
class GenerateMerkleProofRequest(TypedDict, total=False):
    hash_item: str
    data_type: Optional[str]
    timestamp: Optional[str]


class MerkleProof(TypedDict):
    target_hash_hex: str
    data_type: str
    timestamp: str
    position: int
    root_hash_hex: str
    proof_hashes_hex: list[str]
    levels: int
    stored_root_hex: str
    generated_at: str
    lightnet_version: str
    proof_format: str


class VerifyMerkleProofRequest(TypedDict):
    target_hash_hex: str
    proof_hashes_hex: list[str]  # must be 256 entries
    levels: int
    position: int
    root_hash_hex: str


class MerkleProofVerificationResult(TypedDict):
    valid: bool
    message: str
    computed_root_hex: str
    stored_root_hex: str
    target_hash_hex: str
    position: int


# API Response wrapper
class APIResponse(TypedDict, total=False):
    success: bool
    message: Optional[str]
    data: Any
    error: Optional[str]
