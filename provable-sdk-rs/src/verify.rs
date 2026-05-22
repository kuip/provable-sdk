use crate::api::{compute_hash_from_hex, get_record_by_hash};
use crate::error::{ProvableError, Result};
use crate::lightnet::{
    get_merkle_proof, get_record_by_data_item, verify_hash_batch, verify_hash_existence,
};
use crate::merkle_proof::normalize_merkle_proof;
use crate::types::{
    BatchExistenceCheckResult, ComputeHashRequest, HashBatchRequest, HashExistenceRequest,
    LevelCheckResult, NormalizedKayrosRecord, NormalizedMerkleProof,
    VerifyMerkleProofWithDetailsRequest, VerifyMerkleProofWithDetailsResult, VerifyRequest,
    VerifyResult, VerifyResultDetails, VerifyWithInclusionRequest,
};
use crate::util::{
    is_zero_hash, normalize_hex_string, normalize_level_counts, timeuuid_hex_to_timestamp,
    uuid_string_to_hex,
};
use sha2::{Digest, Sha256};
use sha3::Sha3_256;

const ZERO_HASH_32: &str = "0000000000000000000000000000000000000000000000000000000000000000";
const DEFAULT_LEVELS_HASH_TYPE: &str = "sha3-256";

#[derive(Clone)]
struct VerifyCoreState {
    request: CanonicalVerifyRequest,
    record: NormalizedKayrosRecord,
    details: VerifyResultDetails,
}

#[derive(Clone, Default)]
struct CanonicalVerifyRequest {
    data_type: String,
    data_item: Option<String>,
    kayros_hash: Option<String>,
    api_key: Option<String>,
}

pub fn verify(request: VerifyRequest) -> VerifyResult {
    match verify_record_core(request) {
        Ok((result, _)) => result,
        Err(result) => result,
    }
}

pub fn verify_with_inclusion(request: VerifyWithInclusionRequest) -> VerifyResult {
    let (_, state) = match verify_record_core(request.verify_request) {
        Ok(pair) => pair,
        Err(result) => return result,
    };
    let Some(mut state) = state else {
        return VerifyResult {
            valid: true,
            error: None,
            details: None,
        };
    };

    let levels_hash_type = match normalize_levels_hash_type(request.levels_hash_type.as_deref()) {
        Ok(value) => value,
        Err(error) => return invalid_result(state.details, &error.0),
    };
    state.details.levels_hash_type = Some(levels_hash_type.clone());

    let proof_response = match get_merkle_proof(
        &state.request.data_type,
        Some(&state.record.kayros_hash),
        None,
        state.request.api_key.as_deref(),
    ) {
        Ok(response) => response,
        Err(error) => {
            return invalid_result(
                state.details,
                &format!("Failed to fetch merkle proof: {}", error.0),
            )
        }
    };

    let proof = match normalize_merkle_proof(proof_response) {
        Ok(proof) => proof,
        Err(error) => return invalid_result(state.details, &error.0),
    };

    state.details.proof_fetched = Some(true);
    state.details.proof = Some(proof.clone());
    state.details.proof_data_type_match = Some(
        proof.data_type == state.request.data_type
            || utf8_hex(&proof.data_type) == utf8_hex(&state.request.data_type),
    );
    state.details.proof_hash_item_match = Some(proof.hash_item == state.record.kayros_hash);
    if state.details.proof_data_type_match != Some(true) {
        return invalid_result(
            state.details,
            &format!(
                "Proof data_type mismatch: expected={} proof={}",
                state.request.data_type, proof.data_type
            ),
        );
    }
    if state.details.proof_hash_item_match != Some(true) {
        return invalid_result(
            state.details,
            &format!(
                "Proof hash_item mismatch: expected={} proof={}",
                state.record.kayros_hash, proof.hash_item
            ),
        );
    }

    let level_counts =
        match normalize_level_counts(&proof.level_counts, proof.levels, proof.proof.len()) {
            Ok(counts) => counts,
            Err(error) => return invalid_result(state.details, &error.0),
        };
    let (pending, max_level, max_level_position, max_level_hash) =
        proof_inclusion_meta(&proof, &level_counts);
    state.details.pending = Some(pending);
    state.details.max_level = Some(max_level);
    state.details.max_level_position = Some(max_level_position);
    state.details.max_level_hash = Some(max_level_hash.clone());

    if let Err(error) =
        verify_proof_target_position(&proof, &state.record.kayros_hash, &level_counts)
    {
        state.details.target_position_match = Some(false);
        return invalid_result(state.details, &error.0);
    }
    state.details.target_position_match = Some(true);

    if !pending {
        match verify_proof_path(&proof, &level_counts, &levels_hash_type) {
            Ok(root_hash) => {
                state.details.proof_path_match = Some(true);
                state.details.local_root_hash = Some(root_hash);
            }
            Err(error) => {
                state.details.proof_path_match = Some(false);
                return invalid_result(state.details, &error.0);
            }
        }
    }

    if let Some(trusted_root_hash) = request
        .trusted_root_hash
        .as_deref()
        .and_then(normalize_hex_string)
    {
        if !pending {
            state.details.trusted_root_match = Some(proof.root == trusted_root_hash);
            if state.details.trusted_root_match != Some(true) {
                return invalid_result(
                    state.details,
                    &format!(
                        "Root hash mismatch: proof={} trusted={}",
                        proof.root, trusted_root_hash
                    ),
                );
            }
        }
    }

    if let (Some(trusted_level), Some(trusted_position)) =
        (request.trusted_level, request.trusted_position)
    {
        let expected_hash = request
            .trusted_root_hash
            .as_deref()
            .and_then(normalize_hex_string)
            .or_else(|| {
                proof_hash_at_level_position(&proof, &level_counts, trusted_level, trusted_position)
            });
        let Some(expected_hash) = expected_hash else {
            return invalid_result(
                state.details,
                &format!(
                    "Missing proof hash at level={} position={}",
                    trusted_level, trusted_position
                ),
            );
        };
        match verify_hash_existence(
            &HashExistenceRequest {
                data_type: state.request.data_type.clone(),
                level: trusted_level,
                position: trusted_position,
                hash: expected_hash.clone(),
            },
            state.request.api_key.as_deref(),
        ) {
            Ok(response) => {
                let valid = response.exists
                    && response
                        .found_hash
                        .as_deref()
                        .and_then(normalize_hex_string)
                        .map(|hash| hash == expected_hash)
                        .unwrap_or(true);
                state.details.trusted_level_match = Some(valid);
                if !valid {
                    return invalid_result(
                        state.details,
                        response
                            .message
                            .as_deref()
                            .unwrap_or("Trusted level check failed"),
                    );
                }
            }
            Err(error) => {
                return invalid_result(
                    state.details,
                    &format!("Trusted level check failed: {}", error.0),
                )
            }
        }
    }

    if !request.level_checks.is_empty() {
        let mut results = Vec::new();
        for check in request.level_checks {
            let expected_hash = check
                .hash
                .as_deref()
                .and_then(normalize_hex_string)
                .or_else(|| {
                    proof_hash_at_level_position(&proof, &level_counts, check.level, check.position)
                });
            let Some(expected_hash) = expected_hash else {
                return invalid_result(
                    state.details,
                    &format!(
                        "Missing proof hash at level={} position={}",
                        check.level, check.position
                    ),
                );
            };
            match verify_hash_existence(
                &HashExistenceRequest {
                    data_type: state.request.data_type.clone(),
                    level: check.level,
                    position: check.position,
                    hash: expected_hash.clone(),
                },
                state.request.api_key.as_deref(),
            ) {
                Ok(response) => {
                    let valid = response.exists
                        && response
                            .found_hash
                            .as_deref()
                            .and_then(normalize_hex_string)
                            .map(|hash| hash == expected_hash)
                            .unwrap_or(true);
                    results.push(LevelCheckResult {
                        level: check.level,
                        position: check.position,
                        hash: expected_hash.clone(),
                        valid,
                        exists: Some(response.exists),
                        found_hash: response
                            .found_hash
                            .as_deref()
                            .and_then(normalize_hex_string),
                        message: response.message.clone(),
                    });
                    if !valid {
                        state.details.level_checks = Some(results);
                        return invalid_result(
                            state.details,
                            response.message.as_deref().unwrap_or("Level check failed"),
                        );
                    }
                }
                Err(error) => {
                    results.push(LevelCheckResult {
                        level: check.level,
                        position: check.position,
                        hash: expected_hash.clone(),
                        valid: false,
                        exists: None,
                        found_hash: None,
                        message: Some(error.0.clone()),
                    });
                    state.details.level_checks = Some(results);
                    return invalid_result(
                        state.details,
                        &format!("Level check failed: {}", error.0),
                    );
                }
            }
        }
        state.details.level_checks = Some(results);
    }

    if request.verify_batch_existence {
        let mut batch_checks = Vec::new();
        let mut offset = 0usize;
        for (level, count) in level_counts.iter().enumerate() {
            let hashes = proof.proof[offset..offset + count].to_vec();
            let start = proof.level_starts.get(level).copied().unwrap_or(0);
            match verify_hash_batch(
                &HashBatchRequest {
                    data_type: state.request.data_type.clone(),
                    level,
                    start,
                    hashes: hashes.clone(),
                },
                state.request.api_key.as_deref(),
            ) {
                Ok(response) => {
                    let valid = response.mismatches == 0
                        && response.results.iter().all(|result| *result == 1);
                    batch_checks.push(BatchExistenceCheckResult {
                        level,
                        start,
                        hashes,
                        valid,
                        results: response.results,
                        matches: response.matches,
                        mismatches: response.mismatches,
                    });
                    if !valid {
                        state.details.batch_checks = Some(batch_checks);
                        state.details.batch_existence_match = Some(false);
                        return invalid_result(
                            state.details,
                            &format!("Batch existence check failed at level={}", level),
                        );
                    }
                }
                Err(error) => {
                    batch_checks.push(BatchExistenceCheckResult {
                        level,
                        start,
                        hashes,
                        valid: false,
                        results: vec![],
                        matches: 0,
                        mismatches: *count,
                    });
                    state.details.batch_checks = Some(batch_checks);
                    state.details.batch_existence_match = Some(false);
                    return invalid_result(
                        state.details,
                        &format!("Batch existence check failed: {}", error.0),
                    );
                }
            }
            offset += count;
        }
        state.details.batch_checks = Some(batch_checks);
        state.details.batch_existence_match = Some(true);
    }

    VerifyResult {
        valid: true,
        error: None,
        details: Some(state.details),
    }
}

pub fn verify_merkle_proof(
    request: VerifyMerkleProofWithDetailsRequest,
) -> VerifyMerkleProofWithDetailsResult {
    let levels_hash_type = match normalize_levels_hash_type(request.levels_hash_type.as_deref()) {
        Ok(value) => value,
        Err(error) => return invalid_merkle_proof_result(&error.0, None),
    };
    let proof = match normalize_merkle_proof(request.proof) {
        Ok(proof) => proof,
        Err(error) => {
            return invalid_merkle_proof_result(
                &error.0,
                Some((&levels_hash_type, None, None, -1, -1, "", None)),
            )
        }
    };
    let level_counts =
        match normalize_level_counts(&proof.level_counts, proof.levels, proof.proof.len()) {
            Ok(counts) => counts,
            Err(error) => {
                return invalid_merkle_proof_result(
                    &error.0,
                    Some((
                        &levels_hash_type,
                        Some(proof.clone()),
                        None,
                        -1,
                        -1,
                        "",
                        None,
                    )),
                )
            }
        };
    let position_path = build_position_path(proof.position, level_counts.len());
    let (pending, max_level, max_level_position, max_level_hash) =
        proof_inclusion_meta(&proof, &level_counts);
    if pending {
        return VerifyMerkleProofWithDetailsResult {
            valid: false,
            pending: true,
            status: "pending".to_string(),
            message: pending_merkle_proof_message(&proof, &level_counts, &position_path),
            error: None,
            details: pending_merkle_proof_details(&proof, &level_counts),
            position_path,
            levels_hash_type,
            computed_root: None,
            max_level: max_level as i64,
            max_level_position,
            max_level_hash,
            proof: Some(proof),
        };
    }

    let mut details = Vec::new();
    let mut offset = 0usize;
    for level in 0..level_counts.len().saturating_sub(1) {
        let count = level_counts[level];
        let level_hashes = proof.proof[offset..offset + count].to_vec();
        let level_start = proof.level_starts.get(level).copied().unwrap_or(0);
        let next_level_hashes = proof_level_hashes(&proof.proof, &level_counts, level + 1);
        let next_level_start = proof.level_starts.get(level + 1).copied().unwrap_or(0);
        let next_level_position = position_path[level + 1];
        let next_level_index = (next_level_position - next_level_start) as isize;
        let computed_rollup = match hash_hex_concat(&level_hashes, &levels_hash_type) {
            Ok(hash) => hash,
            Err(error) => {
                return invalid_merkle_proof_result(
                    &error.0,
                    Some((
                        &levels_hash_type,
                        Some(proof.clone()),
                        Some(position_path.clone()),
                        max_level as i64,
                        max_level_position,
                        &max_level_hash,
                        None,
                    )),
                )
            }
        };
        let label = display_levels_hash_type(&levels_hash_type);
        if next_level_index < 0 || next_level_index as usize >= next_level_hashes.len() {
            details.push(format!(
                "L{}[{}..{}] -> {} -> L{}[pos {}, idx {}]: pending",
                level,
                level_start,
                level_start + count as i64 - 1,
                label,
                level + 1,
                next_level_position,
                next_level_index,
            ));
            let mut pending_details = details;
            pending_details.extend(higher_level_pending_details(
                level + 1,
                next_level_position,
                next_level_index as i64,
            ));
            return VerifyMerkleProofWithDetailsResult {
                valid: true,
                pending: false,
                status: "valid".to_string(),
                message: format!(
                    "Proof verified for existing levels ({} levels). Higher-level rollup pending.",
                    level + 1
                ),
                error: None,
                details: pending_details,
                position_path,
                levels_hash_type,
                computed_root: Some(computed_rollup),
                max_level: max_level as i64,
                max_level_position,
                max_level_hash,
                proof: Some(proof),
            };
        }
        let expected_hash = &next_level_hashes[next_level_index as usize];
        let matches = computed_rollup == *expected_hash;
        details.push(format!(
            "L{}[{}..{}] -> {} -> L{}[pos {}, idx {}]: {}",
            level,
            level_start,
            level_start + count as i64 - 1,
            label,
            level + 1,
            next_level_position,
            next_level_index,
            if matches { "✓" } else { "✗" }
        ));
        if !matches {
            return VerifyMerkleProofWithDetailsResult {
                valid: false,
                pending: false,
                status: "invalid".to_string(),
                message: format!(
                    "Level {} rollup mismatch at level {} position {}.",
                    level,
                    level + 1,
                    next_level_position
                ),
                error: Some(format!(
                    "Computed {} but expected {}",
                    computed_rollup, expected_hash
                )),
                details,
                position_path,
                levels_hash_type,
                computed_root: Some(computed_rollup),
                max_level: max_level as i64,
                max_level_position,
                max_level_hash,
                proof: Some(proof),
            };
        }
        offset += count;
    }

    let final_level_hashes =
        proof_level_hashes(&proof.proof, &level_counts, level_counts.len() - 1);
    if final_level_hashes.is_empty() {
        return invalid_merkle_proof_result(
            "Missing final proof level",
            Some((
                &levels_hash_type,
                Some(proof),
                Some(position_path),
                max_level as i64,
                max_level_position,
                &max_level_hash,
                None,
            )),
        );
    }
    let computed_root = if final_level_hashes.len() == 1 {
        final_level_hashes[0].clone()
    } else {
        match hash_hex_concat(&final_level_hashes, &levels_hash_type) {
            Ok(hash) => hash,
            Err(error) => {
                return invalid_merkle_proof_result(
                    &error.0,
                    Some((
                        &levels_hash_type,
                        Some(proof),
                        Some(position_path),
                        max_level as i64,
                        max_level_position,
                        &max_level_hash,
                        None,
                    )),
                )
            }
        }
    };
    if proof.root.is_empty() {
        details.push("Root pending: final rollup not yet recorded in proof.root.".to_string());
        return VerifyMerkleProofWithDetailsResult {
            valid: true,
            pending: false,
            status: "valid".to_string(),
            message: format!(
                "Proof verified for existing levels ({} levels). Root pending.",
                level_counts.len()
            ),
            error: None,
            details,
            position_path,
            levels_hash_type,
            computed_root: Some(computed_root),
            max_level: max_level as i64,
            max_level_position,
            max_level_hash,
            proof: Some(proof),
        };
    }
    let root_matches = computed_root == proof.root;
    details.push(format!(
        "Root: {} ({}...)",
        if root_matches { "✓" } else { "✗" },
        &proof.root[..proof.root.len().min(16)]
    ));
    if !root_matches {
        return VerifyMerkleProofWithDetailsResult {
            valid: false,
            pending: false,
            status: "invalid".to_string(),
            message: "Root hash mismatch.".to_string(),
            error: Some(format!(
                "Expected {} but computed {}",
                proof.root, computed_root
            )),
            details,
            position_path,
            levels_hash_type,
            computed_root: Some(computed_root),
            max_level: max_level as i64,
            max_level_position,
            max_level_hash,
            proof: Some(proof),
        };
    }
    VerifyMerkleProofWithDetailsResult {
        valid: true,
        pending: false,
        status: "valid".to_string(),
        message: format!(
            "Proof verified! {} levels, {} hashes.",
            level_counts.len(),
            proof.proof.len()
        ),
        error: None,
        details,
        position_path,
        levels_hash_type,
        computed_root: Some(computed_root),
        max_level: max_level as i64,
        max_level_position,
        max_level_hash,
        proof: Some(proof),
    }
}

fn verify_record_core(
    request: VerifyRequest,
) -> std::result::Result<(VerifyResult, Option<VerifyCoreState>), VerifyResult> {
    let request = CanonicalVerifyRequest {
        data_type: request.data_type.unwrap_or_default(),
        data_item: request.data_item,
        kayros_hash: request.kayros_hash,
        api_key: request.api_key,
    };
    let mut details = VerifyResultDetails {
        lookup_mode: if request.kayros_hash.is_some() {
            "kayros_hash".into()
        } else {
            "data_item".into()
        },
        record_found: false,
        ..Default::default()
    };
    if request.data_type.is_empty() {
        return Err(invalid_result(details, "Missing data_type"));
    }
    if request.data_item.is_none() && request.kayros_hash.is_none() {
        return Err(invalid_result(
            details,
            "Either data_item or kayros_hash is required",
        ));
    }

    let record = if let Some(kayros_hash) = &request.kayros_hash {
        get_record_by_hash(kayros_hash, Some(&request.data_type))
            .and_then(normalize_record)
            .map_err(|error| {
                invalid_result(
                    details.clone(),
                    &format!("Failed to fetch record: {}", error.0),
                )
            })?
    } else {
        fetch_record_by_data_item(
            &request.data_type,
            request.data_item.as_deref().unwrap_or_default(),
            request.api_key.as_deref(),
        )
        .map_err(|error| {
            invalid_result(
                details.clone(),
                &format!("Failed to fetch record: {}", error.0),
            )
        })?
    };

    details.record_found = true;
    details.record = Some(record.clone());
    details.data_type_match = Some(
        record.data_type == request.data_type
            || record.data_type_hex == utf8_hex(&request.data_type),
    );
    if details.data_type_match != Some(true) {
        return Err(invalid_result(
            details,
            &format!(
                "Record data_type mismatch: expected={} record={}",
                request.data_type, record.data_type
            ),
        ));
    }

    if let Some(data_item) = &request.data_item {
        let normalized = normalize_hex_string(data_item);
        details.data_item_match = Some(normalized.as_deref() == Some(&record.data_item));
        if details.data_item_match != Some(true) {
            return Err(invalid_result(
                details,
                &format!(
                    "Record data_item mismatch: expected={} record={}",
                    normalized.unwrap_or_else(|| data_item.clone()),
                    record.data_item
                ),
            ));
        }
    }
    if let Some(kayros_hash) = &request.kayros_hash {
        let normalized = normalize_hex_string(kayros_hash);
        details.kayros_hash_match = Some(normalized.as_deref() == Some(&record.kayros_hash));
        if details.kayros_hash_match != Some(true) {
            return Err(invalid_result(
                details,
                &format!(
                    "Record hash mismatch: expected={} record={}",
                    normalized.unwrap_or_else(|| kayros_hash.clone()),
                    record.kayros_hash
                ),
            ));
        }
    }

    let previous_record = if let Some(prev_hash) = &record.prev_hash {
        if !is_zero_hash(prev_hash) {
            Some(
                get_record_by_hash(prev_hash, Some(&record.data_type))
                    .and_then(normalize_record)
                    .map_err(|error| {
                        invalid_result(
                            details.clone(),
                            &format!("Failed to fetch previous record: {}", error.0),
                        )
                    })?,
            )
        } else {
            None
        }
    } else {
        None
    };
    details.previous_record = previous_record.clone();
    details.chain_link_match = Some(
        previous_record
            .as_ref()
            .map(|previous| {
                previous.data_type == record.data_type
                    && previous.kayros_hash == record.prev_hash.clone().unwrap_or_default()
            })
            .unwrap_or(true),
    );
    if details.chain_link_match != Some(true) {
        return Err(invalid_result(
            details,
            "Previous record chain link mismatch",
        ));
    }

    let compute_request = ComputeHashRequest {
        prev_hash: Some(
            record
                .prev_hash
                .clone()
                .unwrap_or_else(|| ZERO_HASH_32.to_string()),
        ),
        data_type: record.data_type.clone(),
        data_item: record.data_item.clone(),
        timeuuid: record.uuid.clone(),
        hash_type: record.hash_type.clone(),
    };
    let computed =
        compute_hash_from_hex(&compute_request, request.api_key.as_deref()).map_err(|error| {
            invalid_result(
                details.clone(),
                &format!("Failed to recompute Kayros hash: {}", error.0),
            )
        })?;
    details.computed_record_hash = normalize_hex_string(&computed.hash);
    details.record_hash_match =
        Some(details.computed_record_hash.as_deref() == Some(&record.kayros_hash));
    if details.record_hash_match != Some(true) {
        let computed_record_hash = details.computed_record_hash.clone().unwrap_or_default();
        return Err(invalid_result(
            details,
            &format!(
                "Kayros hash mismatch: computed={} record={}",
                computed_record_hash, record.kayros_hash
            ),
        ));
    }

    details.uuid_timestamp_match = Some(!record.timestamp.is_empty());
    if details.uuid_timestamp_match != Some(true) {
        return Err(invalid_result(details, "Invalid record UUID timestamp"));
    }

    let result = VerifyResult {
        valid: true,
        error: None,
        details: Some(details.clone()),
    };
    Ok((
        result,
        Some(VerifyCoreState {
            request,
            record,
            details,
        }),
    ))
}

fn fetch_record_by_data_item(
    data_type: &str,
    data_item: &str,
    api_key: Option<&str>,
) -> Result<NormalizedKayrosRecord> {
    let response = get_record_by_data_item(data_type, data_item, api_key, None)?;
    if response.records.is_empty() {
        return Err(ProvableError::new("Record not found"));
    }
    if response.records.len() > 1 {
        return Err(ProvableError::new(format!(
            "Multiple records found for data_item; provide kayros_hash (count={})",
            response.records.len()
        )));
    }
    normalize_record(response.records[0].clone())
}

pub(crate) fn normalize_record(
    raw: crate::types::GetRecordResponse,
) -> Result<NormalizedKayrosRecord> {
    let data_item = raw
        .data_item_hex
        .as_deref()
        .and_then(normalize_hex_string)
        .or_else(|| normalize_hex_string(&raw.data_item))
        .ok_or_else(|| ProvableError::new("Invalid remote record structure"))?;
    let kayros_hash = raw
        .hash_item_hex
        .as_deref()
        .and_then(normalize_hex_string)
        .or_else(|| normalize_hex_string(&raw.hash_item))
        .ok_or_else(|| ProvableError::new("Invalid remote record structure"))?;
    let prev_hash = raw
        .prev_hash_hex
        .as_deref()
        .and_then(normalize_hex_string)
        .or_else(|| raw.prev_hash.as_deref().and_then(normalize_hex_string));
    let uuid = uuid_string_to_hex(raw.uuid_hex.as_deref().unwrap_or(&raw.ts));
    let timestamp = timeuuid_hex_to_timestamp(&uuid);
    if raw.data_type.is_empty()
        || raw.hash_type.is_empty()
        || uuid.is_empty()
        || timestamp.is_empty()
    {
        return Err(ProvableError::new("Invalid remote record structure"));
    }
    Ok(NormalizedKayrosRecord {
        data_type_hex: utf8_hex(&raw.data_type),
        data_type: raw.data_type.clone(),
        data_item,
        kayros_hash,
        prev_hash,
        hash_type: raw.hash_type.clone(),
        uuid,
        timestamp,
        position: raw.position,
        raw,
    })
}

fn verify_proof_target_position(
    proof: &NormalizedMerkleProof,
    target_hash: &str,
    level_counts: &[usize],
) -> Result<()> {
    if level_counts.is_empty() || level_counts[0] == 0 {
        return Err(ProvableError::new("invalid level count"));
    }
    let index = level_index_for_position(0, proof.position, level_counts[0], &proof.level_starts)?;
    if proof.proof.get(index).map(|value| value.as_str()) != Some(target_hash) {
        return Err(ProvableError::new(format!(
            "target hash not found at expected position index={} expected={} got={}",
            index,
            target_hash,
            proof.proof.get(index).cloned().unwrap_or_default()
        )));
    }
    Ok(())
}

fn verify_proof_path(
    proof: &NormalizedMerkleProof,
    level_counts: &[usize],
    levels_hash_type: &str,
) -> Result<String> {
    let mut offset = 0usize;
    let mut previous_rollup = String::new();
    let mut last_rollup = String::new();
    let mut current_position = proof.position;
    for (level, count) in level_counts.iter().enumerate() {
        if *count == 0 {
            return Err(ProvableError::new("invalid level count"));
        }
        if offset + count > proof.proof.len() {
            return Err(ProvableError::new("proof length mismatch"));
        }
        let level_hashes = &proof.proof[offset..offset + count];
        if !previous_rollup.is_empty() {
            let index =
                level_index_for_position(level, current_position, *count, &proof.level_starts)?;
            if level_hashes.get(index).map(|value| value.as_str()) != Some(previous_rollup.as_str())
            {
                return Err(ProvableError::new(format!(
                    "level hash mismatch level={} index={} expected={} got={}",
                    level,
                    index,
                    previous_rollup,
                    level_hashes.get(index).cloned().unwrap_or_default()
                )));
            }
        }
        let is_last = level == level_counts.len() - 1;
        if is_last && *count == 1 {
            last_rollup = level_hashes[0].clone();
        } else {
            previous_rollup = hash_hex_concat(level_hashes, levels_hash_type)?;
            if is_last {
                last_rollup = previous_rollup.clone();
            }
        }
        offset += count;
        current_position /= 256;
    }
    if last_rollup.is_empty() {
        return Err(ProvableError::new("missing final hash"));
    }
    if !proof.root.is_empty() && last_rollup != proof.root {
        return Err(ProvableError::new(format!(
            "root hash mismatch computed={} root={}",
            last_rollup, proof.root
        )));
    }
    Ok(last_rollup)
}

fn proof_inclusion_meta(
    proof: &NormalizedMerkleProof,
    level_counts: &[usize],
) -> (bool, usize, i64, String) {
    if proof.level_counts.is_empty() || level_counts.is_empty() {
        return (true, 0, -1, String::new());
    }
    let positions = build_position_path(proof.position, level_counts.len());
    let max_level = level_counts.len() - 1;
    let max_level_position = positions[max_level];
    let max_level_hash = if proof.root.is_empty() {
        let level_hashes = proof_level_hashes(&proof.proof, level_counts, max_level);
        let level_start = proof.level_starts.get(max_level).copied().unwrap_or(0);
        let index = (max_level_position - level_start) as usize;
        level_hashes.get(index).cloned().unwrap_or_default()
    } else {
        proof.root.clone()
    };
    let pending = if level_counts.len() < 2 {
        true
    } else {
        let level_start = proof.level_starts.get(1).copied().unwrap_or(0);
        let level_index = positions[1] - level_start;
        level_index < 0 || level_index as usize >= level_counts[1]
    };
    (pending, max_level, max_level_position, max_level_hash)
}

fn proof_hash_at_level_position(
    proof: &NormalizedMerkleProof,
    level_counts: &[usize],
    level: usize,
    position: i64,
) -> Option<String> {
    let level_hashes = proof_level_hashes(&proof.proof, level_counts, level);
    if level_hashes.is_empty() {
        return None;
    }
    level_index_for_position(level, position, level_hashes.len(), &proof.level_starts)
        .ok()
        .and_then(|index| level_hashes.get(index).cloned())
}

fn proof_level_hashes(all_hashes: &[String], level_counts: &[usize], level: usize) -> Vec<String> {
    if level >= level_counts.len() {
        return vec![];
    }
    let offset = level_counts.iter().take(level).sum::<usize>();
    all_hashes[offset..offset + level_counts[level]].to_vec()
}

fn level_index_for_position(
    level: usize,
    current_position: i64,
    count: usize,
    level_starts: &[i64],
) -> Result<usize> {
    if count == 0 {
        return Err(ProvableError::new("invalid level count"));
    }
    let start = level_starts
        .get(level)
        .copied()
        .unwrap_or_else(|| (current_position / count as i64) * count as i64);
    let index = current_position - start;
    if index < 0 || index as usize >= count {
        return Err(ProvableError::new("proof index out of range"));
    }
    Ok(index as usize)
}

fn normalize_levels_hash_type(input: Option<&str>) -> Result<String> {
    match input.map(|value| value.trim().to_lowercase().replace('_', "-")) {
        None => Ok(DEFAULT_LEVELS_HASH_TYPE.to_string()),
        Some(value) if value.is_empty() => Ok(DEFAULT_LEVELS_HASH_TYPE.to_string()),
        Some(value) if value == "sha3" || value == "sha3-256" => Ok("sha3-256".to_string()),
        Some(value) if value == "sha256" || value == "sha-256" => Ok("sha256".to_string()),
        Some(value) => Err(ProvableError::new(format!(
            "Unsupported levels_hash_type: {}",
            value
        ))),
    }
}

fn hash_hex_concat(hashes: &[String], levels_hash_type: &str) -> Result<String> {
    let bytes = hashes
        .iter()
        .map(|hash| hex::decode(hash).map_err(|error| ProvableError::new(error.to_string())))
        .collect::<Result<Vec<_>>>()?
        .concat();
    match levels_hash_type {
        "sha256" => {
            let mut hasher = Sha256::new();
            hasher.update(bytes);
            Ok(hex::encode(hasher.finalize()))
        }
        "sha3-256" => {
            let mut hasher = Sha3_256::new();
            hasher.update(bytes);
            Ok(hex::encode(hasher.finalize()))
        }
        _ => Err(ProvableError::new(format!(
            "Unsupported levels_hash_type: {}",
            levels_hash_type
        ))),
    }
}

fn utf8_hex(value: &str) -> String {
    hex::encode(value.as_bytes())
}

fn invalid_result(mut details: VerifyResultDetails, error: &str) -> VerifyResult {
    VerifyResult {
        valid: false,
        error: Some(error.to_string()),
        details: Some({
            if details.lookup_mode.is_empty() {
                details.lookup_mode = "data_item".to_string();
            }
            details
        }),
    }
}

fn build_position_path(position: i64, levels: usize) -> Vec<i64> {
    if levels == 0 {
        return vec![];
    }
    let mut path = vec![position];
    let mut current = position;
    for _ in 1..levels {
        current /= 256;
        path.push(current);
    }
    path
}

fn pending_merkle_proof_message(
    proof: &NormalizedMerkleProof,
    level_counts: &[usize],
    position_path: &[i64],
) -> String {
    let level0_count = level_counts.first().copied().unwrap_or(0);
    if level_counts.len() < 2 {
        return format!(
            "Proof pending: L0 group has {} hashes and no L1 rollup yet.",
            level0_count
        );
    }
    let level1_position = position_path[1];
    let level1_start = proof.level_starts.get(1).copied().unwrap_or(0);
    let level1_index = level1_position - level1_start;
    format!(
        "Proof pending: L1[pos {}, idx {}] has not been generated yet.",
        level1_position, level1_index
    )
}

fn pending_merkle_proof_details(
    proof: &NormalizedMerkleProof,
    level_counts: &[usize],
) -> Vec<String> {
    let mut details = Vec::new();
    let level0_start = proof.level_starts.first().copied().unwrap_or(0);
    let level0_count = level_counts.first().copied().unwrap_or(0);
    if level0_count > 0 {
        details.push(format!(
            "L0[{}..{}] partial group",
            level0_start,
            level0_start + level0_count as i64 - 1
        ));
    }
    let missing = level_counts
        .iter()
        .map(|count| 256usize.saturating_sub(*count))
        .collect::<Vec<_>>();
    let missing_l0 = missing.first().copied().unwrap_or(0);
    if missing_l0 > 0 {
        details.push(format!(
            "Need {} more L0 records to complete current L0 group.",
            missing_l0
        ));
    }
    let last = level_counts.len().saturating_sub(1);
    if last > 0 && missing.get(last).copied().unwrap_or(0) > 0 {
        let mut needed = missing_l0;
        for (level, miss) in missing.iter().enumerate().skip(1).take(last) {
            if *miss > 0 {
                needed += miss.saturating_sub(1) * 256usize.pow(level as u32);
            }
        }
        if needed > 0 {
            details.push(format!(
                "~{} more L0 records to complete L{} group (to get next-level rollup).",
                needed, last
            ));
        }
    }
    details
}

fn higher_level_pending_details(level: usize, position: i64, index: i64) -> Vec<String> {
    vec![format!(
        "Higher-level rollup pending at L{}[pos {}, idx {}].",
        level, position, index
    )]
}

fn display_levels_hash_type(levels_hash_type: &str) -> &str {
    match levels_hash_type {
        "sha256" => "SHA-256",
        "sha3-256" => "SHA3-256",
        other => other,
    }
}

fn invalid_merkle_proof_result(
    message: &str,
    options: Option<(
        &str,
        Option<NormalizedMerkleProof>,
        Option<Vec<i64>>,
        i64,
        i64,
        &str,
        Option<String>,
    )>,
) -> VerifyMerkleProofWithDetailsResult {
    let (
        levels_hash_type,
        proof,
        position_path,
        max_level,
        max_level_position,
        max_level_hash,
        computed_root,
    ) = options.unwrap_or((DEFAULT_LEVELS_HASH_TYPE, None, None, -1, -1, "", None));
    VerifyMerkleProofWithDetailsResult {
        valid: false,
        pending: false,
        status: "invalid".to_string(),
        message: message.to_string(),
        error: Some(message.to_string()),
        details: vec![],
        position_path: position_path.unwrap_or_default(),
        levels_hash_type: levels_hash_type.to_string(),
        computed_root,
        max_level,
        max_level_position,
        max_level_hash: max_level_hash.to_string(),
        proof,
    }
}
