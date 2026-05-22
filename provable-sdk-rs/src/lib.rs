mod api;
mod config;
mod error;
mod hash;
mod http;
mod lightnet;
mod merkle_proof;
mod options;
mod prove;
mod types;
mod util;
mod verify;

pub use api::{
    compute_hash_from_hex, get_record_by_hash, get_record_by_hash_with_options, prove_single_hash,
    prove_single_hash_with_options,
};
pub use config::{
    format_data_type_for_query, format_hash_for_query, get_api_key, get_kayros_host,
    get_kayros_url, get_record_url, get_user_key, set_api_key, set_kayros_host, set_user_key,
    COMPUTE_HASH_FROM_HEX_ROUTE, DATA_TYPE, DEFAULT_API_KEY, DEFAULT_USER_KEY,
    GET_MERKLE_PROOF_ROUTE, GET_RECORD_BY_DATA_ITEM_ROUTE, GET_RECORD_BY_HASH_ROUTE, KAYROS_HOST,
    PROVE_SINGLE_HASH_ROUTE, VERIFY_HASH_BATCH_ROUTE, VERIFY_HASH_EXISTENCE_ROUTE,
};
pub use error::{ProvableError, Result};
pub use hash::{hash, hash_str, keccak256, keccak256_str, sha256, sha256_str};
pub use lightnet::{
    browse_table, compute_hash_from_hex_lightnet, get_database_stats, get_latest_hashes,
    get_merkle_proof, get_record, get_record_by_data_item, get_record_with_prev_hash,
    get_table_schema, get_tables, query_hashes, send_single_grpc_request, verify_hash,
    verify_hash_batch, verify_hash_existence,
};
pub use merkle_proof::{
    check_merkle_proof_compatibility, get_merkle_proof_levels, normalize_merkle_proof,
};
pub use options::{resolve_request_options, RequestOptions};
pub use prove::{prove_data, prove_data_str, prove_data_with_options};
pub use types::*;
pub use verify::{verify, verify_merkle_proof, verify_with_inclusion};
