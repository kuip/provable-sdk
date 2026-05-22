mod common;

use provable_sdk::{verify_with_inclusion, VerifyRequest, VerifyWithInclusionRequest};

const DATA_TYPE: &str = "benchmark_s32";
const CASES: [(&str, bool, bool); 3] = [
    (
        "2ad24749d627b2bf8339821f2795408f9bd011383a744b95d1d2619b42ef868f",
        true,
        false,
    ),
    (
        "154d496693d7bf53d48c99d01ca602b8bdc03d84ad65448c6a9802c3f4638069",
        true,
        false,
    ),
    (
        "cb2bcf5236387bc6020bcbe4e392da5e8501124e1031f210a5c11218e83012b4",
        true,
        false,
    ),
];

#[test]
fn verify_with_inclusion_live_cases() {
    let _guard = common::lock();
    common::configure_host();

    let levels_hash_type = std::env::var("KAYROS_LEVELS_HASH_TYPE")
        .ok()
        .filter(|value| !value.trim().is_empty());

    for (hash, valid, pending) in CASES {
        let result = verify_with_inclusion(VerifyWithInclusionRequest {
            verify_request: VerifyRequest {
                data_type: Some(DATA_TYPE.to_string()),
                data_item: None,
                kayros_hash: Some(hash.to_string()),
                api_key: None,
            },
            trusted_root_hash: None,
            trusted_level: None,
            trusted_position: None,
            levels_hash_type: levels_hash_type.clone(),
            verify_batch_existence: true,
            level_checks: vec![],
        });

        assert_eq!(result.valid, valid, "unexpected result for hash={hash}: {result:?}");
        let details = result.details.expect("verify details");
        assert_eq!(details.pending, Some(pending), "hash={hash}");
        assert_eq!(details.record_found, true, "hash={hash}");
        assert_eq!(details.record_hash_match, Some(true), "hash={hash}");
        assert_eq!(details.proof_fetched, Some(true), "hash={hash}");
        assert_eq!(details.proof_data_type_match, Some(true), "hash={hash}");
        assert_eq!(details.proof_hash_item_match, Some(true), "hash={hash}");
        assert_eq!(details.target_position_match, Some(true), "hash={hash}");

        if !pending {
            assert_eq!(details.proof_path_match, Some(true), "hash={hash}");
            assert_eq!(details.batch_existence_match, Some(true), "hash={hash}");
        }
    }
}
