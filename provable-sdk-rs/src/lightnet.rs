use crate::config::{
    get_kayros_url, COMPUTE_HASH_FROM_HEX_ROUTE, GET_MERKLE_PROOF_ROUTE,
    GET_RECORD_BY_DATA_ITEM_ROUTE, VERIFY_HASH_BATCH_ROUTE, VERIFY_HASH_EXISTENCE_ROUTE,
};
use crate::error::Result;
use crate::http::{get_json, post_json};
use crate::types::{
    ApiResponse, ColumnInfo, ComputeHashRequest, ComputeHashResponse, DatabaseQuery,
    DatabaseRecord, DatabaseStats, GetRecordByDataItemResponse, HashBatchRequest,
    HashBatchResponse, HashExistenceRequest, HashExistenceResponse, HashRecord, HashVerifyRequest,
    HashVerifyResult, MerkleProofResponse, SingleHashRequest, SingleHashResponse,
    TableBrowseRequest,
};

pub fn query_hashes(query: &DatabaseQuery) -> Result<ApiResponse<Vec<HashRecord>>> {
    post_json(&get_kayros_url("/api/database/query"), query, None)
}

pub fn get_database_stats() -> Result<ApiResponse<DatabaseStats>> {
    get_json(&get_kayros_url("/api/database/stats"), None)
}

pub fn get_latest_hashes(limit: usize) -> Result<ApiResponse<Vec<HashRecord>>> {
    get_json(
        &format!("{}?limit={}", get_kayros_url("/api/database/latest"), limit),
        None,
    )
}

pub fn get_tables() -> Result<ApiResponse<Vec<String>>> {
    get_json(&get_kayros_url("/api/database/tables"), None)
}

pub fn get_table_schema(table_name: &str) -> Result<ApiResponse<Vec<ColumnInfo>>> {
    get_json(
        &format!(
            "{}?table={}",
            get_kayros_url("/api/database/schema"),
            urlencoding::encode(table_name)
        ),
        None,
    )
}

pub fn browse_table(request: &TableBrowseRequest) -> Result<ApiResponse<Vec<serde_json::Value>>> {
    post_json(&get_kayros_url("/api/database/browse"), request, None)
}

pub fn get_record(uuid: &str) -> Result<ApiResponse<DatabaseRecord>> {
    get_json(
        &format!(
            "{}?uuid={}",
            get_kayros_url("/api/database/record"),
            urlencoding::encode(uuid)
        ),
        None,
    )
}

pub fn get_record_with_prev_hash(uuid: &str) -> Result<ApiResponse<DatabaseRecord>> {
    get_json(
        &format!(
            "{}?uuid={}",
            get_kayros_url("/api/database/record-with-prev"),
            urlencoding::encode(uuid)
        ),
        None,
    )
}

pub fn get_record_by_data_item(
    data_type: &str,
    data_item: &str,
    api_key: Option<&str>,
    limit: Option<usize>,
) -> Result<GetRecordByDataItemResponse> {
    let mut url = format!(
        "{}?data_type={}&data_item={}",
        get_kayros_url(GET_RECORD_BY_DATA_ITEM_ROUTE),
        urlencoding::encode(data_type),
        urlencoding::encode(data_item)
    );
    if let Some(limit_value) = limit {
        url.push_str("&limit=");
        url.push_str(&limit_value.to_string());
    }
    get_json(&url, api_key)
}

pub fn verify_hash(request: &HashVerifyRequest) -> Result<ApiResponse<HashVerifyResult>> {
    post_json(&get_kayros_url("/api/verify-hash"), request, None)
}

pub fn compute_hash_from_hex_lightnet(
    request: &ComputeHashRequest,
    api_key: Option<&str>,
) -> Result<ComputeHashResponse> {
    post_json(
        &get_kayros_url(COMPUTE_HASH_FROM_HEX_ROUTE),
        request,
        api_key,
    )
}

pub fn send_single_grpc_request(
    request: &SingleHashRequest,
) -> Result<ApiResponse<SingleHashResponse>> {
    post_json(
        &get_kayros_url(crate::config::PROVE_SINGLE_HASH_ROUTE),
        request,
        None,
    )
}

pub fn get_merkle_proof(
    data_type: &str,
    hash: Option<&str>,
    position: Option<i64>,
    api_key: Option<&str>,
) -> Result<MerkleProofResponse> {
    let mut url = format!(
        "{}?data_type={}",
        get_kayros_url(GET_MERKLE_PROOF_ROUTE),
        urlencoding::encode(data_type)
    );
    if let Some(hash_value) = hash {
        url.push_str("&hash=");
        url.push_str(&urlencoding::encode(hash_value));
    }
    if let Some(position_value) = position {
        url.push_str("&position=");
        url.push_str(&position_value.to_string());
    }
    get_json(&url, api_key)
}

pub fn verify_hash_existence(
    request: &HashExistenceRequest,
    api_key: Option<&str>,
) -> Result<HashExistenceResponse> {
    post_json(
        &get_kayros_url(VERIFY_HASH_EXISTENCE_ROUTE),
        request,
        api_key,
    )
}

pub fn verify_hash_batch(
    request: &HashBatchRequest,
    api_key: Option<&str>,
) -> Result<HashBatchResponse> {
    post_json(&get_kayros_url(VERIFY_HASH_BATCH_ROUTE), request, api_key)
}
