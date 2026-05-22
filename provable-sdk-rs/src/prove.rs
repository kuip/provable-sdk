use crate::api::{prove_single_hash, prove_single_hash_with_options};
use crate::error::Result;
use crate::hash::{hash, hash_str};
use crate::options::RequestOptions;
use crate::types::ProveSingleHashResponse;

pub fn prove_data(
    data: impl AsRef<[u8]>,
    data_type: Option<&str>,
) -> Result<ProveSingleHashResponse> {
    let hashed = hash(data);
    prove_single_hash(&hashed, data_type)
}

pub fn prove_data_with_options(
    data: impl AsRef<[u8]>,
    opts: Option<&RequestOptions>,
) -> Result<ProveSingleHashResponse> {
    let hashed = hash(data);
    prove_single_hash_with_options(&hashed, opts)
}

pub fn prove_data_str(data: &str, data_type: Option<&str>) -> Result<ProveSingleHashResponse> {
    let hashed = hash_str(data);
    prove_single_hash(&hashed, data_type)
}
