# provable-proof

Rust helpers for the Provable proof envelope format.

This crate owns the canonical proof JSON shape used by Provable form, email, and web proofs. It depends on `provable-sdk` for Kayros verification.

All proofs use the same JSON shape:

```json
{
  "data": "<base64 payload bytes>",
  "data_format": "web_form",
  "kayros": {
    "hash": "<hex data hash>",
    "hashAlgorithm": "SHA-256",
    "timestamp": {
      "service": "kayrosbot@0.0.2:prove_single_hash",
      "response": {}
    }
  }
}
```

`data` is always base64. `data_format` tells consumers how to decode the payload: `web_form`, `web_page`, `email`, `raw_hash`, or `""`. If `data_format` is empty or missing, consumers can fall back to payload introspection.

## Installation

```toml
[dependencies]
provable-proof = "0.1.2"
provable-sdk = "0.1.2"
```

## Usage

### 1. Default usage

```rust
use provable_proof::{verify_envelope_with_inclusion, EnvelopeVerifyWithInclusionOverrides, KayrosEnvelope};

let proof_json = std::fs::read_to_string("proof.json").expect("proof.json");
let envelope = KayrosEnvelope::from_json_str(&proof_json).expect("valid proof envelope");

let result = verify_envelope_with_inclusion(
    &envelope,
    &EnvelopeVerifyWithInclusionOverrides {
        verify_batch_existence: true,
        ..Default::default()
    },
);

assert!(result.valid);
```

### 2. Creating proofs

```rust
use provable_proof::{KayrosData, KayrosEnvelope};

let payload = serde_json::json!({
    "id": "form-1",
    "form": {
        "data": {
            "email": "person@example.com"
        }
    }
});

let kayros = KayrosData::default();
let envelope = KayrosEnvelope::from_json_value(&payload, kayros, "web_form").expect("encode proof");
let proof_json = serde_json::to_string_pretty(&envelope.to_proof()).expect("serialize proof");
```

### 3. Usage with API key and custom data type

```rust
use provable_proof::{verify_envelope, EnvelopeVerifyOverrides, KayrosEnvelope};

let proof_json = std::fs::read_to_string("proof.json").expect("proof.json");
let envelope = KayrosEnvelope::from_json_str(&proof_json).expect("valid proof envelope");

let result = verify_envelope(
    &envelope,
    &EnvelopeVerifyOverrides {
        api_key: Some(std::env::var("KAYROS_API_KEY").expect("KAYROS_API_KEY")),
        data_type: Some("benchmark_s32".to_string()),
        ..Default::default()
    },
);

assert!(result.valid);
```

## Main API

- `KayrosEnvelope::new(...)`
- `KayrosEnvelope::from_bytes(...)`
- `KayrosEnvelope::from_text(...)`
- `KayrosEnvelope::from_json_value(...)`
- `KayrosEnvelope::from_json_str(...)`
- `build_envelope_verify_request(...)`
- `verify_envelope(...)`
- `verify_envelope_with_inclusion(...)`

## Data formats

- `web_form`: decoded bytes are a JSON form snapshot
- `web_page`: decoded bytes are a JSON web-proof payload
- `email`: decoded bytes are the full raw email content
- `raw_hash`: decoded bytes are already the Kayros `data_item`
