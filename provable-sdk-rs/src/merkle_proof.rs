use crate::error::{ProvableError, Result};
use crate::types::{
    MerkleProofCompatibilityMismatch, MerkleProofCompatibilityResult, MerkleProofInput,
    MerkleProofLevel, MerkleProofResponse, NormalizedMerkleProof,
};
use crate::util::normalize_hex_string;
use crate::util::normalize_level_counts;
use std::collections::HashMap;

pub fn normalize_merkle_proof(input: impl Into<MerkleProofInput>) -> Result<NormalizedMerkleProof> {
    match input.into() {
        MerkleProofInput::Normalized(value) => Ok(value),
        MerkleProofInput::Response(value) => normalize_merkle_proof_response(value),
    }
}

fn normalize_merkle_proof_response(raw: MerkleProofResponse) -> Result<NormalizedMerkleProof> {
    if !raw.success {
        return Err(ProvableError::new(
            raw.error
                .clone()
                .or(raw.message.clone())
                .unwrap_or_else(|| "Missing merkle proof".to_string()),
        ));
    }
    let hash_item = normalize_hex_string(&raw.hash_item)
        .ok_or_else(|| ProvableError::new("Invalid merkle proof structure"))?;
    let root = normalize_hex_string(&raw.root).unwrap_or_default();
    if raw.data_type.is_empty() {
        return Err(ProvableError::new("Invalid merkle proof structure"));
    }
    let proof = raw
        .proof
        .iter()
        .map(|hash| {
            normalize_hex_string(hash).ok_or_else(|| ProvableError::new("Invalid proof hash"))
        })
        .collect::<Result<Vec<_>>>()?;

    Ok(NormalizedMerkleProof {
        data_type: raw.data_type.clone(),
        hash_item,
        proof,
        root,
        position: raw.position,
        levels: raw.levels,
        level_counts: raw.level_counts.clone(),
        level_starts: raw.level_starts.clone(),
        raw,
    })
}

pub fn get_merkle_proof_levels(
    input: impl Into<MerkleProofInput>,
) -> Result<Vec<MerkleProofLevel>> {
    let proof = normalize_merkle_proof(input)?;
    let level_counts =
        normalize_level_counts(&proof.level_counts, proof.levels, proof.proof.len())?;
    let mut levels = Vec::with_capacity(level_counts.len());
    let mut offset = 0usize;
    for (level, count) in level_counts.iter().enumerate() {
        let start = proof
            .level_starts
            .get(level)
            .copied()
            .unwrap_or_else(|| default_level_start(proof.position, level, *count));
        let hashes = proof.proof[offset..offset + count].to_vec();
        levels.push(MerkleProofLevel {
            level,
            start,
            count: *count,
            hashes,
        });
        offset += count;
    }
    Ok(levels)
}

pub fn check_merkle_proof_compatibility(
    previous_input: impl Into<MerkleProofInput>,
    next_input: impl Into<MerkleProofInput>,
) -> Result<MerkleProofCompatibilityResult> {
    let previous = normalize_merkle_proof(previous_input)?;
    let next = normalize_merkle_proof(next_input)?;
    let previous_levels = get_merkle_proof_levels(previous.clone())?;
    let next_levels = get_merkle_proof_levels(next.clone())?;
    let mut mismatches = Vec::new();

    if previous.data_type != next.data_type {
        mismatches.push(MerkleProofCompatibilityMismatch {
            kind: "data_type".to_string(),
            message: format!(
                "data_type mismatch previous={} next={}",
                previous.data_type, next.data_type
            ),
            ..Default::default()
        });
    }
    if previous.hash_item != next.hash_item {
        mismatches.push(MerkleProofCompatibilityMismatch {
            kind: "hash_item".to_string(),
            previous_hash: Some(previous.hash_item.clone()),
            next_hash: Some(next.hash_item.clone()),
            message: format!(
                "hash_item mismatch previous={} next={}",
                previous.hash_item, next.hash_item
            ),
            ..Default::default()
        });
    }
    if previous.position != next.position {
        mismatches.push(MerkleProofCompatibilityMismatch {
            kind: "position".to_string(),
            previous_position: Some(previous.position),
            next_position: Some(next.position),
            message: format!(
                "position mismatch previous={} next={}",
                previous.position, next.position
            ),
            ..Default::default()
        });
    }

    let next_maps = next_levels
        .iter()
        .map(|level| {
            let map = level
                .hashes
                .iter()
                .enumerate()
                .map(|(index, hash)| (level.start + index as i64, (hash.clone(), index)))
                .collect::<HashMap<_, _>>();
            (level.level, map)
        })
        .collect::<HashMap<_, _>>();

    let mut checked_entries = 0usize;
    for level in &previous_levels {
        let Some(next_level) = next_maps.get(&level.level) else {
            mismatches.push(MerkleProofCompatibilityMismatch {
                kind: "missing_level".to_string(),
                level: Some(level.level),
                message: format!("missing level={} in new proof", level.level),
                ..Default::default()
            });
            continue;
        };

        for (previous_index, previous_hash) in level.hashes.iter().enumerate() {
            let position = level.start + previous_index as i64;
            let Some((next_hash, next_index)) = next_level.get(&position) else {
                mismatches.push(MerkleProofCompatibilityMismatch {
                    kind: "missing_position".to_string(),
                    level: Some(level.level),
                    position: Some(position),
                    previous_index: Some(previous_index),
                    previous_hash: Some(previous_hash.clone()),
                    message: format!(
                        "missing level={} position={} in new proof",
                        level.level, position
                    ),
                    ..Default::default()
                });
                continue;
            };

            checked_entries += 1;
            if next_hash != previous_hash {
                mismatches.push(MerkleProofCompatibilityMismatch {
                    kind: "hash_mismatch".to_string(),
                    level: Some(level.level),
                    position: Some(position),
                    previous_index: Some(previous_index),
                    next_index: Some(*next_index),
                    previous_hash: Some(previous_hash.clone()),
                    next_hash: Some(next_hash.clone()),
                    message: format!(
                        "hash mismatch level={} position={} previous={} next={}",
                        level.level, position, previous_hash, next_hash
                    ),
                    ..Default::default()
                });
            }
        }
    }

    Ok(MerkleProofCompatibilityResult {
        compatible: mismatches.is_empty(),
        checked_entries,
        previous,
        next,
        previous_levels,
        next_levels,
        mismatches,
    })
}

fn default_level_start(position: i64, level: usize, count: usize) -> i64 {
    let level_position = position_at_level(position, level);
    if count == 0 {
        return level_position;
    }
    (level_position / count as i64) * count as i64
}

fn position_at_level(position: i64, level: usize) -> i64 {
    let mut current = position;
    for _ in 0..level {
        current /= 256;
    }
    current
}
