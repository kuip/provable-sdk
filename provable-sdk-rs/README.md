# provable-sdk

Rust SDK for interacting with Kayros through the Provable API.

Do not send raw data to Provable. Hash the data first with your preferred algorithm, or use the helpers in this crate and register the resulting `data_item`.

## Installation

```toml
[dependencies]
provable-sdk = "0.1.2"
```

## Usage

### 1. Default usage

```rust
use provable_sdk::{prove_single_hash, verify, VerifyRequest};

let data_item = "2ee055213dc902d9b2ebab428c780167c500c2c33ef33fa4ca5baab379a23565";

let prove = prove_single_hash(data_item).expect("register hash");
let verify = verify(VerifyRequest {
    data_type: Some("provable_sdk".to_string()),
    data_item: Some(data_item.to_string()),
    kayros_hash: None,
    api_key: None,
});

assert!(prove.success.unwrap_or(false));
assert!(verify.valid);
```

### 2. Usage with API key and custom data type

```rust
use provable_sdk::{
    get_merkle_proof, prove_single_hash_with_options, verify_with_inclusion, RequestOptions, VerifyRequest,
    VerifyWithInclusionRequest,
};

let data_item = "2ee055213dc902d9b2ebab428c780167c500c2c33ef33fa4ca5baab379a23565";
let data_type = "benchmark_s32";
let api_key = std::env::var("KAYROS_API_KEY").expect("KAYROS_API_KEY");

let options = RequestOptions {
    api_key: Some(api_key.clone()),
    data_type: Some(data_type.to_string()),
    host: None,
};

prove_single_hash_with_options(data_item, &options).expect("register hash");

let verify = verify_with_inclusion(VerifyWithInclusionRequest {
    verify_request: VerifyRequest {
        data_type: Some(data_type.to_string()),
        data_item: Some(data_item.to_string()),
        kayros_hash: None,
        api_key: Some(api_key.clone()),
    },
    trusted_root_hash: None,
    trusted_level: None,
    trusted_position: None,
    levels_hash_type: None,
    verify_batch_existence: true,
    level_checks: vec![],
});

assert!(verify.valid);

let kayros_hash = verify
    .details
    .as_ref()
    .and_then(|details| details.record.as_ref())
    .map(|record| record.kayros_hash.clone())
    .expect("kayros hash");

let proof = get_merkle_proof(data_type, &kayros_hash, Some(&api_key)).expect("merkle proof");
assert!(proof.success);
```

## Main API

- `prove_single_hash(...)` and `prove_single_hash_with_options(...)`
- `get_record_by_hash(...)`
- `compute_hash_from_hex(...)`
- `verify(...)`
- `verify_with_inclusion(...)`
- `verify_merkle_proof(...)`
- `get_merkle_proof(...)`
- `verify_hash_existence(...)`
- `verify_hash_batch(...)`
- `normalize_merkle_proof(...)`
- `get_merkle_proof_levels(...)`
- `check_merkle_proof_compatibility(...)`

## Notes

- Default Kayros host: `https://kayros.provable.dev`
- Default `data_type`: `provable_sdk`
- Default API key: the SDK test key, equivalent to the other language SDKs
- Merkle level hashing defaults to `sha3-256` unless explicitly overridden
