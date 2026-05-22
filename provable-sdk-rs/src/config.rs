use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine;
use once_cell::sync::Lazy;
use std::sync::RwLock;

pub const KAYROS_HOST: &str = "https://kayros.provable.dev";
pub const PROVE_SINGLE_HASH_ROUTE: &str = "/api/lightnet/grpc/single-hash";
pub const GET_RECORD_BY_HASH_ROUTE: &str = "/api/lightnet/database/record-by-hash";
pub const GET_RECORD_BY_DATA_ITEM_ROUTE: &str = "/api/lightnet/database/record";
pub const COMPUTE_HASH_FROM_HEX_ROUTE: &str = "/api/lightnet/compute-hash-from-hex";
pub const GET_MERKLE_PROOF_ROUTE: &str = "/api/lightnet/merkle-proof";
pub const VERIFY_HASH_EXISTENCE_ROUTE: &str = "/api/lightnet/merkle/verify-hash-existence";
pub const VERIFY_HASH_BATCH_ROUTE: &str = "/api/lightnet/merkle/verify-hash-batch";

pub const DATA_TYPE: &str = "provable_sdk";
pub const DEFAULT_USER_KEY: &str =
    "0x0000000000000000000000000000000000000000000000000000000000000001";
pub const DEFAULT_API_KEY: &str = DEFAULT_USER_KEY;

static KAYROS_HOST_OVERRIDE: Lazy<RwLock<String>> =
    Lazy::new(|| RwLock::new(KAYROS_HOST.to_string()));
static API_KEY_OVERRIDE: Lazy<RwLock<String>> =
    Lazy::new(|| RwLock::new(DEFAULT_API_KEY.to_string()));

pub fn set_kayros_host(host: impl Into<String>) {
    *KAYROS_HOST_OVERRIDE.write().expect("kayros host lock") = host.into();
}

pub fn get_kayros_host() -> String {
    KAYROS_HOST_OVERRIDE
        .read()
        .expect("kayros host lock")
        .clone()
}

pub fn get_kayros_url(route: &str) -> String {
    format!("{}{}", get_kayros_host(), route)
}

pub fn set_user_key(key: impl Into<String>) {
    *API_KEY_OVERRIDE.write().expect("api key lock") = key.into();
}

pub fn get_user_key() -> String {
    API_KEY_OVERRIDE.read().expect("api key lock").clone()
}

pub fn set_api_key(key: impl Into<String>) {
    set_user_key(key);
}

pub fn get_api_key() -> String {
    get_user_key()
}

pub fn resolve_api_key(override_key: Option<&str>) -> String {
    override_key
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(get_api_key)
}

pub fn format_data_type_for_query(data_type: &str) -> String {
    data_type.to_string()
}

pub fn format_hash_for_query(hash: &str) -> String {
    let trimmed = hash.trim();
    if trimmed.len() == 64 && trimmed.chars().all(|ch| ch.is_ascii_hexdigit()) {
        return hex::decode(trimmed)
            .ok()
            .map(|bytes| BASE64_STANDARD.encode(bytes))
            .unwrap_or_else(|| trimmed.to_string());
    }
    trimmed.to_string()
}

pub fn get_record_url(hash: &str, data_type: Option<&str>) -> String {
    let hash_value = format_hash_for_query(hash);
    let data_type_value = format_data_type_for_query(data_type.unwrap_or(DATA_TYPE));
    let formatted_hash = urlencoding::encode(&hash_value);
    let formatted_data_type = urlencoding::encode(&data_type_value);
    format!(
        "{}{}?hash={}&data_type={}",
        get_kayros_host(),
        GET_RECORD_BY_HASH_ROUTE,
        formatted_hash,
        formatted_data_type
    )
}
