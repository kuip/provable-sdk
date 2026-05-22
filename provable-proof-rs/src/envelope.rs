use crate::types::{KayrosData, KayrosProof, ProofDataFormat};
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine;
use provable_sdk::{keccak256, sha256, ProvableError, Result};
use serde::Serialize;

fn decode_base64(value: &str) -> Result<Vec<u8>> {
    BASE64_STANDARD.decode(value.trim()).map_err(|error| {
        ProvableError::new(format!(
            "Invalid proof data: expected base64 string ({})",
            error
        ))
    })
}

fn encode_base64(bytes: &[u8]) -> String {
    BASE64_STANDARD.encode(bytes)
}

fn normalize_hash(value: Option<&str>) -> Option<String> {
    value.and_then(|input| {
        let trimmed = input.trim();
        if trimmed.is_empty() {
            return None;
        }
        let normalized = trimmed.trim_start_matches("0x").to_lowercase();
        if normalized.len() % 2 == 0 && normalized.chars().all(|ch| ch.is_ascii_hexdigit()) {
            return Some(normalized);
        }
        BASE64_STANDARD.decode(trimmed).ok().map(hex::encode)
    })
}

fn first_string(values: &[Option<String>]) -> Option<String> {
    values
        .iter()
        .flatten()
        .find(|value| !value.is_empty())
        .cloned()
}

#[derive(Debug, Clone, PartialEq)]
pub struct KayrosEnvelope {
    pub data: String,
    pub data_format: ProofDataFormat,
    pub kayros: KayrosData,
    data_bytes: Vec<u8>,
}

impl KayrosEnvelope {
    pub fn new(
        data: impl Into<String>,
        kayros: KayrosData,
        data_format: impl Into<String>,
    ) -> Result<Self> {
        let data = data.into();
        let data_bytes = decode_base64(&data)?;
        Ok(Self {
            data,
            data_format: data_format.into(),
            kayros,
            data_bytes,
        })
    }

    pub fn from_bytes(
        data: &[u8],
        kayros: KayrosData,
        data_format: impl Into<String>,
    ) -> Result<Self> {
        Self::new(encode_base64(data), kayros, data_format)
    }

    pub fn from_text(
        data: &str,
        kayros: KayrosData,
        data_format: impl Into<String>,
    ) -> Result<Self> {
        Self::from_bytes(data.as_bytes(), kayros, data_format)
    }

    pub fn from_json_value<T: Serialize>(
        data: &T,
        kayros: KayrosData,
        data_format: impl Into<String>,
    ) -> Result<Self> {
        let serialized = serde_json::to_vec(data)?;
        Self::from_bytes(&serialized, kayros, data_format)
    }

    pub fn from_json_str(json: &str) -> Result<Self> {
        let parsed: KayrosProof = serde_json::from_str(json)?;
        Self::new(
            parsed.data,
            parsed.kayros,
            parsed.data_format.unwrap_or_default(),
        )
    }

    pub fn get_data_format(&self) -> String {
        self.data_format.clone()
    }

    pub fn get_data_hash(&self) -> Option<String> {
        normalize_hash(self.kayros.hash.as_deref())
    }

    pub fn get_data_type(&self) -> Option<String> {
        self.kayros
            .timestamp
            .as_ref()
            .and_then(|timestamp| timestamp.response.data.as_ref())
            .map(|record| record.data_type.clone())
    }

    pub fn get_data_type_label(&self) -> Option<String> {
        self.get_data_type()
    }

    pub fn get_data_type_lookup_candidates(&self) -> Vec<Option<String>> {
        vec![self.get_data_type()]
    }

    pub fn get_kayros_hash(&self) -> Option<String> {
        let direct = self
            .kayros
            .timestamp
            .as_ref()
            .and_then(|timestamp| timestamp.response.response.as_ref())
            .and_then(|response| response.hash.clone());
        let fallback = self
            .kayros
            .timestamp
            .as_ref()
            .and_then(|timestamp| timestamp.response.data.as_ref())
            .map(|record| record.hash_item.clone());
        normalize_hash(first_string(&[direct, fallback]).as_deref())
    }

    pub fn get_timeuuid(&self) -> Option<String> {
        first_string(&[
            self.kayros
                .timestamp
                .as_ref()
                .and_then(|timestamp| timestamp.response.response.as_ref())
                .and_then(|response| response.timeuuid.clone()),
            self.kayros
                .timestamp
                .as_ref()
                .and_then(|timestamp| timestamp.response.data.as_ref())
                .map(|record| record.ts.clone()),
        ])
    }

    pub fn get_hash_algorithm(&self) -> String {
        self.kayros
            .hash_algorithm
            .clone()
            .unwrap_or_else(|| "sha256".to_string())
            .to_lowercase()
            .replace('_', "")
            .replace('-', "")
    }

    pub fn get_data(&self) -> &[u8] {
        &self.data_bytes
    }

    pub fn get_data_text(&self) -> Result<String> {
        String::from_utf8(self.data_bytes.clone())
            .map_err(|error| ProvableError::new(error.to_string()))
    }

    pub fn parse_data_json<T: serde::de::DeserializeOwned>(&self) -> Result<T> {
        Ok(serde_json::from_slice(&self.data_bytes)?)
    }

    pub fn to_proof(&self) -> KayrosProof {
        KayrosProof {
            data: self.data.clone(),
            data_format: Some(self.data_format.clone()),
            kayros: self.kayros.clone(),
        }
    }

    pub fn compute_data_hash(&self) -> Result<String> {
        if self.data_format == "raw_hash" {
            return Ok(hex::encode(&self.data_bytes));
        }
        Ok(match self.get_hash_algorithm().as_str() {
            "keccak256" => keccak256(&self.data_bytes),
            _ => sha256(&self.data_bytes),
        })
    }
}
