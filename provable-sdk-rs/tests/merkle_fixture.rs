use provable_sdk::{
    check_merkle_proof_compatibility, get_merkle_proof_levels, normalize_merkle_proof,
    GetRecordResponse, MerkleProofResponse,
};

fn load_json<T: serde::de::DeserializeOwned>(name: &str) -> T {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("testdata")
        .join(name);
    serde_json::from_str(&std::fs::read_to_string(path).expect("fixture file"))
        .expect("fixture json")
}

#[test]
fn real_proofs_belong_to_same_record() {
    let record: GetRecordResponse = load_json("proof1_record.json");
    let proofs = [
        load_json::<MerkleProofResponse>("proof1_merkle_1.json"),
        load_json::<MerkleProofResponse>("proof1_merkle_2.json"),
        load_json::<MerkleProofResponse>("proof1_merkle_3.json"),
        load_json::<MerkleProofResponse>("proof1_merkle_4.json"),
    ];

    for proof in proofs {
        assert_eq!(proof.data_type, record.data_type);
        assert_eq!(proof.hash_item, record.hash_item);
        assert_eq!(proof.position, record.position);
    }
}

#[test]
fn merkle_fixture_chain_grows_monotonically() {
    let proofs = [
        load_json::<MerkleProofResponse>("proof1_merkle_1.json"),
        load_json::<MerkleProofResponse>("proof1_merkle_2.json"),
        load_json::<MerkleProofResponse>("proof1_merkle_3.json"),
        load_json::<MerkleProofResponse>("proof1_merkle_4.json"),
    ];

    for (previous, next) in [(0usize, 1usize), (1, 2), (2, 3), (0, 3)] {
        let result =
            check_merkle_proof_compatibility(proofs[previous].clone(), proofs[next].clone())
                .unwrap();
        assert!(result.compatible, "{:?}", result.mismatches);
        assert_eq!(result.checked_entries, proofs[previous].proof.len());
        assert!(result.mismatches.is_empty());
    }
}

#[test]
fn merkle_fixture_levels_and_reverse_mismatch_are_stable() {
    let v1: MerkleProofResponse = load_json("proof1_merkle_1.json");
    let v4: MerkleProofResponse = load_json("proof1_merkle_4.json");
    let normalized = normalize_merkle_proof(v1.clone()).unwrap();
    assert_eq!(normalized.level_counts, vec![160, 134]);
    assert_eq!(normalized.level_starts, vec![99840, 256]);

    let levels = get_merkle_proof_levels(v4.clone()).unwrap();
    assert_eq!(
        levels
            .iter()
            .map(|level| (level.level, level.start, level.count))
            .collect::<Vec<_>>(),
        vec![(0, 99840, 256), (1, 256, 256), (2, 1, 1)]
    );

    let reverse = check_merkle_proof_compatibility(v4, v1).unwrap();
    assert!(!reverse.compatible);
    assert_eq!(reverse.checked_entries, 294);
    let kinds = reverse
        .mismatches
        .iter()
        .map(|m| m.kind.as_str())
        .collect::<Vec<_>>();
    assert!(kinds.contains(&"missing_position"));
    assert!(kinds.contains(&"missing_level"));
}
