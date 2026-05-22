use crate::envelope::KayrosEnvelope;
use crate::types::{
    EnvelopeVerifyDetails, EnvelopeVerifyInput, EnvelopeVerifyOverrides, EnvelopeVerifyResult,
    EnvelopeVerifyWithInclusionOverrides,
};
use provable_sdk::{
    verify, verify_with_inclusion, VerifyRequest, VerifyResult, VerifyResultDetails,
    VerifyWithInclusionRequest,
};

fn normalize_hex(value: Option<&str>) -> Option<String> {
    value.and_then(|input| {
        let trimmed = input.trim();
        if trimmed.is_empty() {
            return None;
        }
        let normalized = trimmed.trim_start_matches("0x").to_lowercase();
        if normalized.len() % 2 == 0 && normalized.chars().all(|ch| ch.is_ascii_hexdigit()) {
            Some(normalized)
        } else {
            None
        }
    })
}

fn invalid_envelope_result(details: EnvelopeVerifyDetails, error: String) -> EnvelopeVerifyResult {
    EnvelopeVerifyResult {
        valid: false,
        error: Some(error),
        details: Some(details),
    }
}

fn merge_details(
    base: Option<VerifyResultDetails>,
    extra: EnvelopeVerifyDetails,
) -> EnvelopeVerifyDetails {
    EnvelopeVerifyDetails {
        verify: base.unwrap_or_else(|| {
            let mut details = VerifyResultDetails::default();
            details.lookup_mode = if extra.envelope_kayros_hash.is_some() {
                "kayros_hash".to_string()
            } else {
                "data_item".to_string()
            };
            details.record_found = false;
            details
        }),
        computed_data_item: extra.computed_data_item,
        envelope_data_item: extra.envelope_data_item,
        envelope_data_item_match: extra.envelope_data_item_match,
        envelope_data_type: extra.envelope_data_type,
        envelope_kayros_hash: extra.envelope_kayros_hash,
    }
}

pub fn build_envelope_verify_request(
    envelope: &KayrosEnvelope,
    overrides: &EnvelopeVerifyOverrides,
) -> provable_sdk::Result<EnvelopeVerifyInput> {
    let computed_data_item = normalize_hex(Some(&envelope.compute_data_hash()?));
    let envelope_data_item = envelope.get_data_hash();
    let envelope_data_type = overrides
        .data_type
        .clone()
        .or_else(|| envelope.get_data_type())
        .or_else(|| envelope.get_data_type_label());
    let envelope_kayros_hash = envelope.get_kayros_hash();

    Ok(EnvelopeVerifyInput {
        request: VerifyRequest {
            data_type: envelope_data_type.clone(),
            data_item: overrides
                .data_item
                .clone()
                .or_else(|| computed_data_item.clone())
                .and_then(|value| normalize_hex(Some(&value))),
            kayros_hash: overrides
                .kayros_hash
                .clone()
                .or_else(|| envelope_kayros_hash.clone())
                .and_then(|value| normalize_hex(Some(&value))),
            api_key: overrides.api_key.clone(),
        },
        details: EnvelopeVerifyDetails {
            verify: VerifyResultDetails::default(),
            computed_data_item: computed_data_item.clone(),
            envelope_data_item: envelope_data_item.clone(),
            envelope_data_item_match: match (
                envelope_data_item.as_ref(),
                computed_data_item.as_ref(),
            ) {
                (Some(expected), Some(computed)) => Some(expected == computed),
                _ => None,
            },
            envelope_data_type,
            envelope_kayros_hash,
        },
    })
}

pub fn verify_envelope(
    envelope: &KayrosEnvelope,
    overrides: &EnvelopeVerifyOverrides,
) -> EnvelopeVerifyResult {
    let input = match build_envelope_verify_request(envelope, overrides) {
        Ok(input) => input,
        Err(error) => {
            return EnvelopeVerifyResult {
                valid: false,
                error: Some(error.0),
                details: None,
            }
        }
    };
    if input.details.envelope_data_item_match == Some(false) {
        let expected = input.details.envelope_data_item.clone().unwrap_or_default();
        let computed = input.details.computed_data_item.clone().unwrap_or_default();
        return invalid_envelope_result(
            input.details,
            format!(
                "Envelope data_item mismatch: expected={} computed={}",
                expected, computed
            ),
        );
    }

    let result: VerifyResult = verify(input.request.clone());
    EnvelopeVerifyResult {
        valid: result.valid,
        error: result.error.clone(),
        details: Some(merge_details(result.details, input.details)),
    }
}

pub fn verify_envelope_with_inclusion(
    envelope: &KayrosEnvelope,
    overrides: &EnvelopeVerifyWithInclusionOverrides,
) -> EnvelopeVerifyResult {
    let input = match build_envelope_verify_request(envelope, &overrides.overrides) {
        Ok(input) => input,
        Err(error) => {
            return EnvelopeVerifyResult {
                valid: false,
                error: Some(error.0),
                details: None,
            }
        }
    };
    if input.details.envelope_data_item_match == Some(false) {
        let expected = input.details.envelope_data_item.clone().unwrap_or_default();
        let computed = input.details.computed_data_item.clone().unwrap_or_default();
        return invalid_envelope_result(
            input.details,
            format!(
                "Envelope data_item mismatch: expected={} computed={}",
                expected, computed
            ),
        );
    }
    let request = VerifyWithInclusionRequest {
        verify_request: input.request.clone(),
        trusted_root_hash: overrides.trusted_root_hash.clone(),
        trusted_level: overrides.trusted_level,
        trusted_position: overrides.trusted_position,
        levels_hash_type: overrides.levels_hash_type.clone(),
        verify_batch_existence: overrides.verify_batch_existence,
        level_checks: overrides.level_checks.clone(),
    };
    let result = verify_with_inclusion(request);
    EnvelopeVerifyResult {
        valid: result.valid,
        error: result.error.clone(),
        details: Some(merge_details(result.details, input.details)),
    }
}
