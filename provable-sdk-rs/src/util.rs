use crate::error::{ProvableError, Result};
use base64::engine::general_purpose::{STANDARD as BASE64_STANDARD, URL_SAFE as BASE64_URL_SAFE};
use base64::Engine;
use chrono::{TimeZone, Utc};

pub fn decode_flexible_bytes(value: &str) -> Option<Vec<u8>> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    let normalized = trimmed.strip_prefix("0x").unwrap_or(trimmed);
    if normalized.len() % 2 == 0 && normalized.chars().all(|ch| ch.is_ascii_hexdigit()) {
        return hex::decode(normalized).ok();
    }

    BASE64_STANDARD
        .decode(trimmed)
        .ok()
        .or_else(|| BASE64_URL_SAFE.decode(trimmed).ok())
}

pub fn normalize_hex_string(value: &str) -> Option<String> {
    decode_flexible_bytes(value).map(hex::encode)
}

pub fn uuid_string_to_hex(value: &str) -> String {
    let normalized = value.trim().replace('-', "").to_lowercase();
    if normalized.len() == 32 && normalized.chars().all(|ch| ch.is_ascii_hexdigit()) {
        normalized
    } else {
        String::new()
    }
}

pub fn timeuuid_hex_to_timestamp(uuid_hex: &str) -> String {
    let bytes = match hex::decode(uuid_hex) {
        Ok(bytes) if bytes.len() == 16 => bytes,
        _ => return String::new(),
    };

    let time_low = ((bytes[0] as u64) << 24)
        | ((bytes[1] as u64) << 16)
        | ((bytes[2] as u64) << 8)
        | bytes[3] as u64;
    let time_mid = ((bytes[4] as u64) << 8) | bytes[5] as u64;
    let time_hi = ((((bytes[6] as u64) << 8) | bytes[7] as u64) & 0x0fff) as u64;
    let timestamp = time_low | (time_mid << 32) | (time_hi << 48);
    const UUID_GREGORIAN_EPOCH: i128 = 122_192_928_000_000_000;
    let unix_nanos = (timestamp as i128 - UUID_GREGORIAN_EPOCH) * 100;
    let unix_millis = unix_nanos / 1_000_000;
    Utc.timestamp_millis_opt(unix_millis as i64)
        .single()
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_default()
}

pub fn is_zero_hash(value: &str) -> bool {
    value.chars().all(|ch| ch == '0')
}

pub fn normalize_level_counts(
    counts: &[usize],
    levels: usize,
    proof_len: usize,
) -> Result<Vec<usize>> {
    if proof_len == 0 {
        return Err(ProvableError::new("empty proof path"));
    }
    if !counts.is_empty() {
        if counts.iter().any(|count| *count == 0) {
            return Err(ProvableError::new("invalid level count"));
        }
        if counts.iter().sum::<usize>() != proof_len {
            return Err(ProvableError::new("proof length mismatch"));
        }
        return Ok(counts.to_vec());
    }
    if levels <= 1 {
        return Ok(vec![proof_len]);
    }
    let remaining = proof_len.saturating_sub(256 * (levels - 1));
    if remaining == 0 {
        return Err(ProvableError::new("proof length mismatch"));
    }
    let mut result = vec![256; levels - 1];
    result.push(remaining);
    Ok(result)
}
