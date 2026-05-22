use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct ProveSingleHashResponse {
    pub success: bool,
    pub hash: Option<String>,
    pub timeuuid: Option<String>,
    pub encoding: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct GetRecordResponse {
    pub data_item: String,
    pub data_type: String,
    pub hash_item: String,
    pub hash_type: String,
    pub position: i64,
    pub prev_hash: Option<String>,
    pub ts: String,
    #[serde(default)]
    pub data_item_hex: Option<String>,
    #[serde(default)]
    pub hash_item_hex: Option<String>,
    #[serde(default)]
    pub prev_hash_hex: Option<String>,
    #[serde(default)]
    pub uuid_hex: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct GetRecordByDataItemResponse {
    #[serde(default)]
    pub records: Vec<GetRecordResponse>,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct ComputeHashRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prev_hash: Option<String>,
    pub data_type: String,
    pub data_item: String,
    pub timeuuid: String,
    pub hash_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct ComputeHashResponse {
    pub hash: String,
    pub hash_type: String,
    pub input_size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct MerkleProofResponse {
    pub success: bool,
    pub data_type: String,
    pub hash_item: String,
    #[serde(default)]
    pub proof: Vec<String>,
    pub root: String,
    pub position: i64,
    pub levels: usize,
    #[serde(default)]
    pub level_counts: Vec<usize>,
    #[serde(default)]
    pub level_starts: Vec<i64>,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct HashExistenceRequest {
    pub data_type: String,
    pub level: usize,
    pub position: i64,
    pub hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct HashExistenceResponse {
    pub exists: bool,
    pub level: usize,
    pub position: i64,
    pub data_type: String,
    #[serde(default)]
    pub found_hash: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct HashBatchRequest {
    pub data_type: String,
    pub level: usize,
    pub start: i64,
    pub hashes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct HashBatchResponse {
    pub data_type: String,
    pub level: usize,
    pub start: i64,
    pub count: usize,
    #[serde(default)]
    pub results: Vec<i32>,
    pub matches: usize,
    pub mismatches: usize,
    #[serde(default)]
    pub error: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct VerifyRequest {
    pub data_type: Option<String>,
    pub data_item: Option<String>,
    pub kayros_hash: Option<String>,
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct VerifyLevelCheck {
    pub level: usize,
    pub position: i64,
    #[serde(default)]
    pub hash: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct VerifyWithInclusionRequest {
    pub verify_request: VerifyRequest,
    pub trusted_root_hash: Option<String>,
    pub trusted_level: Option<usize>,
    pub trusted_position: Option<i64>,
    pub levels_hash_type: Option<String>,
    pub verify_batch_existence: bool,
    pub level_checks: Vec<VerifyLevelCheck>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct VerifyMerkleProofWithDetailsRequest {
    pub proof: MerkleProofInput,
    pub levels_hash_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct NormalizedKayrosRecord {
    pub data_type: String,
    pub data_type_hex: String,
    pub data_item: String,
    pub kayros_hash: String,
    #[serde(default)]
    pub prev_hash: Option<String>,
    pub hash_type: String,
    pub uuid: String,
    pub timestamp: String,
    pub position: i64,
    pub raw: GetRecordResponse,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct NormalizedMerkleProof {
    pub data_type: String,
    pub hash_item: String,
    pub proof: Vec<String>,
    pub root: String,
    pub position: i64,
    pub levels: usize,
    pub level_counts: Vec<usize>,
    pub level_starts: Vec<i64>,
    pub raw: MerkleProofResponse,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MerkleProofInput {
    Response(MerkleProofResponse),
    Normalized(NormalizedMerkleProof),
}

impl Default for MerkleProofInput {
    fn default() -> Self {
        Self::Response(MerkleProofResponse::default())
    }
}

impl From<MerkleProofResponse> for MerkleProofInput {
    fn from(value: MerkleProofResponse) -> Self {
        Self::Response(value)
    }
}

impl From<NormalizedMerkleProof> for MerkleProofInput {
    fn from(value: NormalizedMerkleProof) -> Self {
        Self::Normalized(value)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct MerkleProofLevel {
    pub level: usize,
    pub start: i64,
    pub count: usize,
    pub hashes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct MerkleProofCompatibilityMismatch {
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub level: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub position: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub previous_index: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_index: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub previous_position: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_position: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub previous_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_hash: Option<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct MerkleProofCompatibilityResult {
    pub compatible: bool,
    pub checked_entries: usize,
    pub previous: NormalizedMerkleProof,
    pub next: NormalizedMerkleProof,
    pub previous_levels: Vec<MerkleProofLevel>,
    pub next_levels: Vec<MerkleProofLevel>,
    pub mismatches: Vec<MerkleProofCompatibilityMismatch>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct LevelCheckResult {
    pub level: usize,
    pub position: i64,
    pub hash: String,
    pub valid: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exists: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub found_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct BatchExistenceCheckResult {
    pub level: usize,
    pub start: i64,
    pub hashes: Vec<String>,
    pub valid: bool,
    pub results: Vec<i32>,
    pub matches: usize,
    pub mismatches: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct VerifyResultDetails {
    pub lookup_mode: String,
    pub record_found: bool,
    pub ambiguous: Option<bool>,
    pub ambiguous_count: Option<usize>,
    pub data_type_match: Option<bool>,
    pub data_item_match: Option<bool>,
    pub kayros_hash_match: Option<bool>,
    pub record_hash_match: Option<bool>,
    pub chain_link_match: Option<bool>,
    pub uuid_timestamp_match: Option<bool>,
    pub proof_fetched: Option<bool>,
    pub proof_data_type_match: Option<bool>,
    pub proof_hash_item_match: Option<bool>,
    pub proof_path_match: Option<bool>,
    pub target_position_match: Option<bool>,
    pub trusted_root_match: Option<bool>,
    pub trusted_level_match: Option<bool>,
    pub batch_existence_match: Option<bool>,
    pub levels_hash_type: Option<String>,
    pub pending: Option<bool>,
    pub max_level: Option<usize>,
    pub max_level_position: Option<i64>,
    pub max_level_hash: Option<String>,
    pub computed_record_hash: Option<String>,
    pub local_root_hash: Option<String>,
    pub record: Option<NormalizedKayrosRecord>,
    pub previous_record: Option<NormalizedKayrosRecord>,
    pub proof: Option<NormalizedMerkleProof>,
    pub level_checks: Option<Vec<LevelCheckResult>>,
    pub batch_checks: Option<Vec<BatchExistenceCheckResult>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct VerifyResult {
    pub valid: bool,
    #[serde(default)]
    pub error: Option<String>,
    #[serde(default)]
    pub details: Option<VerifyResultDetails>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct VerifyMerkleProofWithDetailsResult {
    pub valid: bool,
    pub pending: bool,
    pub status: String,
    pub message: String,
    #[serde(default)]
    pub error: Option<String>,
    #[serde(default)]
    pub details: Vec<String>,
    #[serde(default)]
    pub position_path: Vec<i64>,
    pub levels_hash_type: String,
    #[serde(default)]
    pub computed_root: Option<String>,
    pub max_level: i64,
    pub max_level_position: i64,
    pub max_level_hash: String,
    #[serde(default)]
    pub proof: Option<NormalizedMerkleProof>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct DatabaseQuery {
    #[serde(default)]
    pub data_type: Option<String>,
    #[serde(default)]
    pub hash_type: Option<String>,
    #[serde(default)]
    pub min_timestamp: Option<String>,
    #[serde(default)]
    pub max_timestamp: Option<String>,
    pub limit: usize,
    pub offset: usize,
    pub order_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct HashRecord {
    pub timestamp: String,
    pub data_type: String,
    pub data_item: String,
    pub hash_type: String,
    pub hash_item: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct DatabaseStats {
    pub total_hashes: i64,
    #[serde(default)]
    pub count_by_type: HashMap<String, i64>,
    pub min_timestamp: String,
    pub max_timestamp: String,
    pub timestamp_range: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct ColumnInfo {
    pub name: String,
    pub r#type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct TableBrowseRequest {
    pub table_name: String,
    pub offset: usize,
    pub limit: usize,
    #[serde(default)]
    pub order_by: Option<String>,
    #[serde(default)]
    pub search_term: Option<String>,
    #[serde(default)]
    pub search_column: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct DatabaseRecord {
    pub data_type: String,
    pub data_item_hex: String,
    pub uuid_hex: String,
    pub hash_item_hex: String,
    #[serde(default)]
    pub prev_hash_hex: Option<String>,
    pub hash_type: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct HashVerifyRequest {
    pub prev_hash: String,
    pub data_type: String,
    pub data_item: String,
    pub uuid: String,
    pub hash_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct HashVerifyResult {
    pub computed_hash: String,
    pub hash_input_hex: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct SingleHashRequest {
    pub data_type: String,
    pub data_item: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct SingleHashResponse {
    pub success: bool,
    pub message: String,
    pub data_type: String,
    pub data_item: String,
    pub computed_hash_hex: String,
    pub timeuuid_hex: String,
    pub data_type_hex: String,
    pub data_item_hex: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct ApiResponse<T> {
    pub success: bool,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub data: Option<T>,
    #[serde(default)]
    pub error: Option<String>,
}
