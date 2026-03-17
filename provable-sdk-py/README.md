# Provable SDK for Python

`provable-sdk-py` is the Kayros API and verification SDK for Python.

## Installation

```bash
pip install provable-sdk
```

## Usage

### 1. Default usage

Use the built-in key and the default `provable_sdk` data type.

```python
from provable_sdk import prove_single_hash, get_record_by_hash, verify, verify_with_inclusion

data_item = "ab" * 32
proof = prove_single_hash(data_item)
kayros_hash = proof["hash"]

record = get_record_by_hash(kayros_hash)

verified = verify({
    "data_type": "provable_sdk",
    "data_item": data_item,
    "kayros_hash": kayros_hash,
})

inclusion = verify_with_inclusion({
    "data_type": "provable_sdk",
    "kayros_hash": kayros_hash,
})
```

### 2. Usage with API key and custom data type

```python
import os

from provable_sdk import prove_single_hash, verify, verify_with_inclusion, set_api_key

settings = {
    "api_key": os.environ["KAYROS_API_KEY"],
    "data_type": "kayros_indexer_v1",
}

set_api_key(settings["api_key"])

proof = prove_single_hash(
    "ab" * 32,
    data_type=settings["data_type"],
    api_key=settings["api_key"],
)
kayros_hash = proof["hash"]

verified = verify({
    "data_type": settings["data_type"],
    "data_item": "ab" * 32,
    "kayros_hash": kayros_hash,
    "api_key": settings["api_key"],
})

inclusion = verify_with_inclusion({
    "data_type": settings["data_type"],
    "kayros_hash": kayros_hash,
    "api_key": settings["api_key"],
    "verify_batch_existence": True,
})
```

## Main API

- `prove_single_hash(data_hash, data_type=None, api_key=None)`
- `get_record_by_hash(kayros_hash, data_type=None, api_key=None)`
- `get_record_by_data_item(data_type, data_item, api_key=None)`
- `get_merkle_proof({"data_type": ..., "hash": ...}, api_key=None)`
- `verify_hash_existence({"data_type": ..., "level": ..., "position": ..., "hash": ...}, api_key=None)`
- `verify_hash_batch({"data_type": ..., "level": ..., "start": ..., "hashes": [...]}, api_key=None)`
- `verify({"data_type": ..., "data_item"?: ..., "kayros_hash"?: ..., "api_key"?: ...})`
- `verify_with_inclusion({"data_type": ..., "data_item"?: ..., "kayros_hash"?: ..., "api_key"?: ..., "trusted_root_hash"?: ..., "trusted_level"?: ..., "trusted_position"?: ..., "verify_batch_existence"?: ..., "level_checks"?: [...]})`

`data_type` is required for verification. Provide at least one of `data_item` or `kayros_hash`.

## License

MIT
