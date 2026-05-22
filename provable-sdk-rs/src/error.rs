use std::error::Error;
use std::fmt::{Display, Formatter};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProvableError(pub String);

impl ProvableError {
    pub fn new(message: impl Into<String>) -> Self {
        Self(message.into())
    }
}

impl Display for ProvableError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl Error for ProvableError {}

impl From<reqwest::Error> for ProvableError {
    fn from(value: reqwest::Error) -> Self {
        Self(value.to_string())
    }
}

impl From<serde_json::Error> for ProvableError {
    fn from(value: serde_json::Error) -> Self {
        Self(value.to_string())
    }
}

impl From<std::io::Error> for ProvableError {
    fn from(value: std::io::Error) -> Self {
        Self(value.to_string())
    }
}

pub type Result<T> = std::result::Result<T, ProvableError>;
