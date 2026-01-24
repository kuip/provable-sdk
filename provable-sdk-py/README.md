# Provable SDK for Python

A Python SDK for interacting with the Provable Kayros API.

## Installation

```bash
pip install provable-sdk
```

## Usage

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

### Record Functions

- `get_record_by_hash(record_hash: str) -> GetRecordResponse` - Get Kayros record by hash

### Verify Function

- `verify(envelope: KayrosEnvelope) -> VerifyResult` - Verify data against Kayros proof

## KayrosEnvelope

The `KayrosEnvelope` class wraps data with Kayros proof metadata:

```python
envelope = KayrosEnvelope(data=my_data, kayros=kayros_metadata)

# Helper methods
envelope.get_data()           # Get data as bytes (decodes base64 for V0)
envelope.get_data_hash()      # Get the data hash (data_item_hex)
envelope.get_data_type()      # Get the data type (data_type_hex)
envelope.get_kayros_hash()    # Get the Kayros hash (computed_hash_hex)
envelope.get_time_uuid()      # Get the time UUID (timeuuid_hex)
envelope.get_hash_algorithm() # Get hash algorithm (defaults to 'sha256')
envelope.is_v0()              # Check if V0 format (legacy, for email proofs)
```

### Envelope Formats

- **V1 (default)**: Hash stored in `kayros["hash"]`, data is plain string or object
- **V0 (legacy)**: Hash in `kayros["data"]["data_item_hex"]`, data is base64-encoded bytes (used for email proofs)

## Configuration

Default configuration:
- `KAYROS_HOST`: `https://kayros.provable.dev`
- API Routes:
  - Single Hash: `/api/grpc/single-hash`
  - Get Record: `/api/database/record-by-hash`

## License

MIT
