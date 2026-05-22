use provable_sdk::{
    GetRecordResponse, ProveSingleHashResponse, VerifyLevelCheck, VerifyResultDetails,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct KayrosTimestampResponse {
    pub success: bool,
    #[serde(default)]
    pub response: Option<ProveSingleHashResponse>,
    #[serde(default)]
    pub data: Option<GetRecordResponse>,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct KayrosTimestamp {
    pub service: String,
    pub response: KayrosTimestampResponse,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct KayrosData {
    #[serde(default)]
    pub hash: Option<String>,
    #[serde(default)]
    pub hash_algorithm: Option<String>,
    #[serde(default)]
    pub timestamp: Option<KayrosTimestamp>,
}

pub type KayrosMetadata = KayrosData;
pub type ProofDataFormat = String;
pub type ProvableEmailProofData = String;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct KayrosProof {
    pub data: String,
    #[serde(default)]
    pub data_format: Option<ProofDataFormat>,
    pub kayros: KayrosData,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct ProvableFormProofData {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub page_url: Option<String>,
    #[serde(default)]
    pub form: Option<serde_json::Value>,
    #[serde(default)]
    pub network: Option<serde_json::Value>,
    #[serde(flatten)]
    pub extra: serde_json::Map<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct ProvableWebProofSource<T> {
    pub value: T,
    pub hash: String,
}

pub type ProvableWebProofData = serde_json::Value;

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct EnvelopeVerifyOverrides {
    pub data_type: Option<String>,
    pub data_item: Option<String>,
    pub kayros_hash: Option<String>,
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct EnvelopeVerifyWithInclusionOverrides {
    pub overrides: EnvelopeVerifyOverrides,
    pub trusted_root_hash: Option<String>,
    pub trusted_level: Option<usize>,
    pub trusted_position: Option<i64>,
    pub verify_batch_existence: bool,
    pub level_checks: Vec<VerifyLevelCheck>,
    pub levels_hash_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EnvelopeVerifyDetails {
    #[serde(flatten)]
    pub verify: VerifyResultDetails,
    #[serde(default)]
    pub computed_data_item: Option<String>,
    #[serde(default)]
    pub envelope_data_item: Option<String>,
    #[serde(default)]
    pub envelope_data_item_match: Option<bool>,
    #[serde(default)]
    pub envelope_data_type: Option<String>,
    #[serde(default)]
    pub envelope_kayros_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct EnvelopeVerifyResult {
    pub valid: bool,
    #[serde(default)]
    pub error: Option<String>,
    #[serde(default)]
    pub details: Option<EnvelopeVerifyDetails>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct EnvelopeVerifyInput {
    pub request: provable_sdk::VerifyRequest,
    pub details: EnvelopeVerifyDetails,
}
