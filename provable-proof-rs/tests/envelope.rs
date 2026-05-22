use provable_proof::{
    build_envelope_verify_request, verify_envelope, EnvelopeVerifyOverrides, KayrosData,
    KayrosEnvelope, KayrosTimestamp, KayrosTimestampResponse,
};
use provable_sdk::{sha256, GetRecordResponse, ProveSingleHashResponse};

fn sample_kayros_data(data_hash: &str) -> KayrosData {
    KayrosData {
        hash: Some(data_hash.to_string()),
        hash_algorithm: Some("SHA-256".to_string()),
        timestamp: Some(KayrosTimestamp {
            service: "kayrosbot@0.0.2:prove_single_hash".to_string(),
            response: KayrosTimestampResponse {
                success: true,
                response: Some(ProveSingleHashResponse {
                    success: true,
                    hash: Some(
                        "10e797e1f9129b72f03f6221c74cdf6ca5f4fd55a2be357c8f2294c1595a5d13"
                            .to_string(),
                    ),
                    timeuuid: Some("c75e7ffe3b5a11f18000fca800000000".to_string()),
                    encoding: Some(String::new()),
                    error: None,
                }),
                data: Some(GetRecordResponse {
                    data_item: data_hash.to_string(),
                    data_type: "provable_form".to_string(),
                    hash_item: "1a14570a7348bdf8f7a3434c6f5f8dd2053bc5630c8cde54da04974da2360382"
                        .to_string(),
                    hash_type: "sha3_256".to_string(),
                    position: 0,
                    prev_hash: Some("00".repeat(32)),
                    ts: "c75e7ffe-3b5a-11f1-8000-fca800000000".to_string(),
                    data_item_hex: None,
                    hash_item_hex: None,
                    prev_hash_hex: None,
                    uuid_hex: None,
                }),
                message: None,
                error: None,
            },
        }),
    }
}

#[test]
fn envelope_roundtrip_preserves_base64_payload_and_json_data() {
    let payload = serde_json::json!({
        "id": "form-1",
        "form": {
            "data": {
                "email": "person@example.com"
            }
        }
    });
    let payload_text = serde_json::to_string(&payload).unwrap();
    let data_hash = sha256(payload_text.as_bytes());
    let envelope =
        KayrosEnvelope::from_json_value(&payload, sample_kayros_data(&data_hash), "web_form")
            .unwrap();

    assert_eq!(envelope.get_data_format(), "web_form");
    assert_eq!(envelope.get_data_text().unwrap(), payload_text);
    assert_eq!(
        envelope.parse_data_json::<serde_json::Value>().unwrap(),
        payload
    );
    assert_eq!(envelope.compute_data_hash().unwrap(), data_hash);
}

#[test]
fn build_verify_request_uses_envelope_values_by_default() {
    let payload = serde_json::json!({ "hello": "world" });
    let payload_text = serde_json::to_string(&payload).unwrap();
    let data_hash = sha256(payload_text.as_bytes());
    let envelope =
        KayrosEnvelope::from_json_value(&payload, sample_kayros_data(&data_hash), "web_form")
            .unwrap();

    let input =
        build_envelope_verify_request(&envelope, &EnvelopeVerifyOverrides::default()).unwrap();

    assert_eq!(input.request.data_type.as_deref(), Some("provable_form"));
    assert_eq!(input.request.data_item.as_deref(), Some(data_hash.as_str()));
    assert_eq!(
        input.request.kayros_hash.as_deref(),
        Some("10e797e1f9129b72f03f6221c74cdf6ca5f4fd55a2be357c8f2294c1595a5d13")
    );
    assert_eq!(input.details.envelope_data_item_match, Some(true));
}

#[test]
fn verify_envelope_rejects_mismatched_embedded_data_hash_before_network() {
    let payload = serde_json::json!({ "hello": "world" });
    let envelope =
        KayrosEnvelope::from_json_value(&payload, sample_kayros_data(&"ff".repeat(32)), "web_form")
            .unwrap();

    let result = verify_envelope(&envelope, &EnvelopeVerifyOverrides::default());

    assert!(!result.valid);
    assert!(result
        .error
        .unwrap_or_default()
        .contains("Envelope data_item mismatch"));
    assert_eq!(
        result
            .details
            .as_ref()
            .and_then(|details| details.envelope_data_item_match),
        Some(false)
    );
}
