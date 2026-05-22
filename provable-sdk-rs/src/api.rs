use crate::config::{
    format_data_type_for_query, format_hash_for_query, get_kayros_url, COMPUTE_HASH_FROM_HEX_ROUTE,
    GET_RECORD_BY_HASH_ROUTE, PROVE_SINGLE_HASH_ROUTE,
};
use crate::error::Result;
use crate::http::{get_json, post_json};
use crate::options::{resolve_request_options, RequestOptions};
use crate::types::{
    ComputeHashRequest, ComputeHashResponse, GetRecordResponse, ProveSingleHashResponse,
};

pub fn prove_single_hash(
    data_hash: &str,
    data_type: Option<&str>,
) -> Result<ProveSingleHashResponse> {
    let opts = data_type.map(|value| RequestOptions {
        data_type: Some(value.to_string()),
        ..RequestOptions::default()
    });
    prove_single_hash_with_options(data_hash, opts.as_ref())
}

pub fn prove_single_hash_with_options(
    data_hash: &str,
    opts: Option<&RequestOptions>,
) -> Result<ProveSingleHashResponse> {
    let (data_type, _, api_key) = resolve_request_options(opts);
    let body = serde_json::json!({
        "data_item": data_hash,
        "data_type": data_type,
    });
    post_json(
        &get_kayros_url(PROVE_SINGLE_HASH_ROUTE),
        &body,
        api_key.as_deref(),
    )
}

pub fn get_record_by_hash(record_hash: &str, data_type: Option<&str>) -> Result<GetRecordResponse> {
    let opts = data_type.map(|value| RequestOptions {
        data_type: Some(value.to_string()),
        ..RequestOptions::default()
    });
    get_record_by_hash_with_options(record_hash, opts.as_ref())
}

pub fn get_record_by_hash_with_options(
    record_hash: &str,
    opts: Option<&RequestOptions>,
) -> Result<GetRecordResponse> {
    let formatted_hash = format_hash_for_query(record_hash);
    let (data_type, include_data_type, api_key) = resolve_request_options(opts);
    let mut url = format!(
        "{}?hash={}",
        get_kayros_url(GET_RECORD_BY_HASH_ROUTE),
        urlencoding::encode(&formatted_hash)
    );
    if include_data_type {
        url.push_str("&data_type=");
        url.push_str(&urlencoding::encode(&format_data_type_for_query(
            &data_type,
        )));
    }
    get_json(&url, api_key.as_deref())
}

pub fn compute_hash_from_hex(
    request: &ComputeHashRequest,
    api_key: Option<&str>,
) -> Result<ComputeHashResponse> {
    post_json(
        &get_kayros_url(COMPUTE_HASH_FROM_HEX_ROUTE),
        request,
        api_key,
    )
}
