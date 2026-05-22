mod common;

use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine;
use provable_sdk::{
    get_record_by_hash, keccak256_str, prove_single_hash, verify, VerifyRequest,
};

const DEFAULT_TEST_DATA_TYPE: &str = "provable_sdk_tests";

#[test]
fn full_cycle_live_integration() {
    let _guard = common::lock();
    common::configure_host();

    let data_type = std::env::var("KAYROS_TEST_DATA_TYPE")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_TEST_DATA_TYPE.to_string());

    let test_data = format!(
        "Rust integration test data {}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("unix epoch")
            .as_millis()
    );
    let data_hash = keccak256_str(&test_data);
    assert_eq!(data_hash.len(), 64);
    assert!(data_hash.chars().all(|ch| ch.is_ascii_hexdigit()));

    let kayros_response = prove_single_hash(&data_hash, Some(&data_type)).expect("prove_single_hash");
    assert!(kayros_response.success);

    let computed_hash = kayros_response.hash.expect("kayros hash");
    assert_eq!(computed_hash.len(), 64);

    let verify_result = verify(VerifyRequest {
        data_type: Some(data_type.clone()),
        data_item: Some(data_hash.clone()),
        kayros_hash: Some(computed_hash.clone()),
        api_key: None,
    });

    assert!(verify_result.valid, "{verify_result:?}");
    assert!(verify_result.error.is_none(), "{verify_result:?}");
    let details = verify_result.details.expect("verify details");
    assert_eq!(details.data_item_match, Some(true));
    assert_eq!(details.kayros_hash_match, Some(true));
    assert_eq!(details.record_hash_match, Some(true));

    let record = details.record.expect("normalized record");
    assert_eq!(record.data_item, data_hash);
    assert_eq!(record.kayros_hash, computed_hash);

    let fetched = get_record_by_hash(&computed_hash, Some(&data_type)).expect("get_record_by_hash");
    let data_item_hex = BASE64_STANDARD
        .decode(fetched.data_item)
        .map(hex::encode)
        .expect("base64 data_item");
    assert_eq!(data_item_hex, record.data_item);
}
