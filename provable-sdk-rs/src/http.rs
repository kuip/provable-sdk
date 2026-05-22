use crate::config::resolve_api_key;
use crate::error::{ProvableError, Result};
use reqwest::blocking::{Client, Response};
use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE};
use serde::de::DeserializeOwned;
use serde::Serialize;

fn client() -> Client {
    Client::builder().build().expect("reqwest client")
}

fn headers(api_key: Option<&str>) -> Result<HeaderMap> {
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers.insert(
        "X-User-Key",
        HeaderValue::from_str(&resolve_api_key(api_key))
            .map_err(|error| ProvableError::new(error.to_string()))?,
    );
    Ok(headers)
}

fn handle_response<T: DeserializeOwned>(response: Response) -> Result<T> {
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_default();
        return Err(ProvableError::new(format!(
            "API error: {} {}",
            status, body
        )));
    }
    Ok(response.json::<T>()?)
}

pub fn get_json<T: DeserializeOwned>(url: &str, api_key: Option<&str>) -> Result<T> {
    let response = client().get(url).headers(headers(api_key)?).send()?;
    handle_response(response)
}

pub fn post_json<B: Serialize, T: DeserializeOwned>(
    url: &str,
    body: &B,
    api_key: Option<&str>,
) -> Result<T> {
    let response = client()
        .post(url)
        .headers(headers(api_key)?)
        .json(body)
        .send()?;
    handle_response(response)
}
