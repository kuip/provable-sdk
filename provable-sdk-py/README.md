# Provable SDK for Python

A Python SDK for interacting with the Provable Kayros API.

## Installation

```bash
pip install provable-sdk
```

## Usage

```python
from provable_sdk import (
    hash,
    keccak256,
    hash_str,
    keccak256_str,
    prove_single_hash,
    get_record_by_hash,
    prove_data,
    prove_data_str,
    verify,
)

# Hash bytes
data = b'\x01\x02\x03\x04'
data_hash = hash(data)  # or keccak256(data)

# Hash string
text = "Hello, Provable!"
str_hash = hash_str(text)  # or keccak256_str(text)

# Prove a hash
proof = prove_single_hash(data_hash)

# Get a record by hash
record = get_record_by_hash(proof["data"]["computed_hash_hex"])

# Prove data directly
data_proof = prove_data(data)

# Prove string data directly
str_proof = prove_data_str(text)

# Verify data with Kayros proof
envelope = {
    "data": {"message": "Hello, Provable!"},
    "kayros": {
        "hash": "abc123...",
        "hashAlgorithm": "keccak256",
        "timestamp": {
            "service": "https://kayros.provable.dev/api/grpc/single-hash",
            "response": proof,
        },
    },
}

result = verify(envelope)
if result["valid"]:
    print("Verification successful!")
else:
    print(f"Verification failed: {result['error']}")
```

## API

### Hash Functions

- `hash(data: bytes) -> str` - Compute keccak256 hash of bytes
- `keccak256(data: bytes) -> str` - Alias for `hash`
- `hash_str(s: str) -> str` - Compute keccak256 hash of a UTF-8 string
- `keccak256_str(s: str) -> str` - Alias for `hash_str`

### Prove Functions

- `prove_single_hash(data_hash: str) -> ProveSingleHashResponse` - Prove a hash via Kayros API
- `prove_data(data: bytes) -> ProveSingleHashResponse` - Hash and prove bytes
- `prove_data_str(s: str) -> ProveSingleHashResponse` - Hash and prove a string

### Record Functions

- `get_record_by_hash(record_hash: str) -> GetRecordResponse` - Get Kayros record by hash

### Verify Function

- `verify(envelope: KayrosEnvelope) -> VerifyResult` - Verify data against Kayros proof

## Configuration

Default configuration:
- `KAYROS_HOST`: `https://kayros.provable.dev`
- API Routes:
  - Single Hash: `/api/grpc/single-hash`
  - Get Record: `/api/database/record-by-hash`

## License

MIT
