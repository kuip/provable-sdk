use provable_sdk::{verify_merkle_proof, MerkleProofResponse, VerifyMerkleProofWithDetailsRequest};
use sha3::{Digest, Sha3_256};

fn level0(count: usize) -> Vec<String> {
    (0..count)
        .map(|index| format!("{:02x}", index).repeat(32))
        .collect()
}

#[test]
fn verify_merkle_proof_marks_missing_l1_as_pending() {
    let hashes = level0(255);
    let result = verify_merkle_proof(VerifyMerkleProofWithDetailsRequest {
        proof: MerkleProofResponse {
            success: true,
            data_type: "proof_type".to_string(),
            hash_item: hashes[5].clone(),
            proof: hashes,
            root: String::new(),
            position: 5,
            levels: 1,
            level_counts: vec![255],
            level_starts: vec![0],
            ..Default::default()
        }
        .into(),
        levels_hash_type: None,
    });

    assert!(!result.valid);
    assert!(result.pending);
    assert_eq!(result.status, "pending");
    assert!(result.message.contains("no L1 rollup yet"));
    assert_eq!(result.position_path, vec![5]);
}

#[test]
fn verify_merkle_proof_verifies_finalized_proof() {
    let hashes = level0(256);
    let level1 = hex::encode(Sha3_256::digest(hex::decode(hashes.join("")).unwrap()));
    let result = verify_merkle_proof(VerifyMerkleProofWithDetailsRequest {
        proof: MerkleProofResponse {
            success: true,
            data_type: "proof_type".to_string(),
            hash_item: hashes[7].clone(),
            proof: hashes
                .iter()
                .cloned()
                .chain(std::iter::once(level1.clone()))
                .collect(),
            root: level1.clone(),
            position: 7,
            levels: 2,
            level_counts: vec![256, 1],
            level_starts: vec![0, 0],
            ..Default::default()
        }
        .into(),
        levels_hash_type: None,
    });

    assert!(result.valid);
    assert!(!result.pending);
    assert_eq!(result.status, "valid");
    assert_eq!(result.levels_hash_type, "sha3-256");
    assert_eq!(result.computed_root.as_deref(), Some(level1.as_str()));
}

#[test]
fn verify_merkle_proof_reports_rollup_mismatch() {
    let hashes = level0(256);
    let result = verify_merkle_proof(VerifyMerkleProofWithDetailsRequest {
        proof: MerkleProofResponse {
            success: true,
            data_type: "proof_type".to_string(),
            hash_item: hashes[3].clone(),
            proof: hashes
                .iter()
                .cloned()
                .chain(std::iter::once("ff".repeat(32)))
                .collect(),
            root: "ff".repeat(32),
            position: 3,
            levels: 2,
            level_counts: vec![256, 1],
            level_starts: vec![0, 0],
            ..Default::default()
        }
        .into(),
        levels_hash_type: None,
    });

    assert!(!result.valid);
    assert!(!result.pending);
    assert_eq!(result.status, "invalid");
    assert!(result.message.contains("Level 0 rollup mismatch"));
}
