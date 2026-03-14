# Provable SDK for Python

A Python SDK for interacting with the Provable Kayros API.

## Installation

```bash
pip install provable-sdk
```

## Usage

### 1. Default usage

Use the SDK with no explicit API key and no custom data type. This uses the default `provable_sdk` data type and the built-in default key.

```python
from provable_sdk import (
    keccak256,
    keccak256_str,
    sha256,
    sha256_str,
    prove_single_hash,
    get_record_by_hash,
    prove_data,
    prove_data_str,
    verify,
    KayrosEnvelope,
)

# Hash bytes (keccak256)
data = b'\x01\x02\x03\x04'
data_hash = keccak256(data)

# Hash string (sha256 - default)
text = "Hello, Provable!"
str_hash = sha256_str(text)

# Prove a hash
proof = prove_single_hash(data_hash)

# Get a record by hash
record = get_record_by_hash(proof["data"]["computed_hash_hex"])

# Prove data directly
data_proof = prove_data(data)

# Prove string data directly
str_proof = prove_data_str(text)

# Create and verify a KayrosEnvelope
envelope = KayrosEnvelope(
    data={"message": "Hello, Provable!"},
    kayros={
        "hash": str_hash,
        "hashAlgorithm": "sha256",
        "timestamp": {
            "service": "kayros",
            "response": proof,
        },
    },
)

result = verify(envelope)
if result["valid"]:
    print("Verification successful!")
else:
    print(f"Verification failed: {result['error']}")
```

### 2. Usage with API key and custom data type

If your app stores a private API key and a project-specific data type in settings, pass them into the SDK when you call the API.

```python
import os

from provable_sdk import (
    prove_single_hash,
    prove_data,
    get_record_by_hash,
    verify,
    KayrosEnvelope,
    set_api_key,
)

settings = {
    "api_key": os.environ["KAYROS_API_KEY"],
    "data_type": "kayros_indexer_v1",
}

# Optional: set the key once for subsequent calls.
set_api_key(settings["api_key"])

proof = prove_single_hash(
    "your_hash_here",
    data_type=settings["data_type"],
    api_key=settings["api_key"],
)

data_proof = prove_data(
    b"hello",
    data_type=settings["data_type"],
    api_key=settings["api_key"],
)

record = get_record_by_hash(
    "computed_hash_here",
    data_type=settings["data_type"],
    api_key=settings["api_key"],
)

envelope = KayrosEnvelope(
    data="hello",
    kayros={
        "hash": "local_data_hash",
        "hashAlgorithm": "keccak256",
        "timestamp": {
            "service": "kayros",
            "response": proof,
        },
    },
)

result = verify(
    envelope,
    api_key=settings["api_key"],
    data_type=settings["data_type"],
)
```

## API

### Hash Functions

- `keccak256(data: bytes) -> str` - Compute keccak256 hash of bytes
- `keccak256_str(s: str) -> str` - Compute keccak256 hash of a UTF-8 string
- `sha256(data: bytes) -> str` - Compute SHA-256 hash of bytes
- `sha256_str(s: str) -> str` - Compute SHA-256 hash of a UTF-8 string
- `hash` / `hash_str` - Aliases for keccak256 functions

### Prove Functions

- `prove_single_hash(data_hash: str) -> ProveSingleHashResponse` - Prove a hash via Kayros API
- `prove_data(data: bytes) -> ProveSingleHashResponse` - Hash and prove bytes
- `prove_data_str(s: str) -> ProveSingleHashResponse` - Hash and prove a string
- `set_api_key(api_key: str) -> None` - Set the API key used for subsequent requests

You can also pass request options directly:

- `prove_single_hash(data_hash, data_type="kayros_indexer_v1", api_key="...")`
- `prove_data(data, data_type="kayros_indexer_v1", api_key="...")`
- `prove_data_str(text, data_type="kayros_indexer_v1", api_key="...")`

### Record Functions

- `get_record_by_hash(record_hash: str) -> GetRecordResponse` - Get Kayros record by hash

Request options:

- `get_record_by_hash(record_hash, data_type="kayros_indexer_v1", api_key="...")`
- `get_record_by_hash(record_hash, data_type=None, api_key="...")` omits the `data_type` lookup query parameter.

### Verify Function

- `verify(envelope: KayrosEnvelope) -> VerifyResult` - Verify data against Kayros proof

Request options:

- `verify(envelope, api_key="...", data_type="kayros_indexer_v1")`

## KayrosEnvelope

The `KayrosEnvelope` class wraps data with Kayros proof metadata:

```python
envelope = KayrosEnvelope(data=my_data, kayros=kayros_metadata)

# Helper methods
envelope.get_data()           # Get data as bytes
envelope.get_data_hash()      # Get the data hash (data_item_hex)
envelope.get_data_type()      # Get the data type (data_type_hex)
envelope.get_kayros_hash()    # Get the Kayros hash (computed_hash_hex)
envelope.get_time_uuid()      # Get the time UUID (timeuuid_hex)
envelope.get_hash_algorithm() # Get hash algorithm (defaults to 'sha256')
```

## License

MIT
