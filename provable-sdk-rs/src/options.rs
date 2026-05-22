#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct RequestOptions {
    pub data_type: Option<String>,
    pub omit_data_type: bool,
    pub api_key: Option<String>,
}

pub fn resolve_request_options(opts: Option<&RequestOptions>) -> (String, bool, Option<String>) {
    match opts {
        None => (crate::config::DATA_TYPE.to_string(), true, None),
        Some(options) if options.omit_data_type => ("".to_string(), false, options.api_key.clone()),
        Some(options) => (
            options
                .data_type
                .clone()
                .unwrap_or_else(|| crate::config::DATA_TYPE.to_string()),
            true,
            options.api_key.clone(),
        ),
    }
}
