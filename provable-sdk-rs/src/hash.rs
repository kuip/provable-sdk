use sha2::{Digest, Sha256};
use sha3::Keccak256;

pub fn keccak256(data: impl AsRef<[u8]>) -> String {
    let mut hasher = Keccak256::new();
    hasher.update(data.as_ref());
    hex::encode(hasher.finalize())
}

pub fn hash(data: impl AsRef<[u8]>) -> String {
    keccak256(data)
}

pub fn keccak256_str(value: &str) -> String {
    keccak256(value.as_bytes())
}

pub fn hash_str(value: &str) -> String {
    keccak256_str(value)
}

pub fn sha256(data: impl AsRef<[u8]>) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data.as_ref());
    hex::encode(hasher.finalize())
}

pub fn sha256_str(value: &str) -> String {
    sha256(value.as_bytes())
}
