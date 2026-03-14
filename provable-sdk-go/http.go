package provable

import (
	"bytes"
	"net/http"
)

func doJSONPost(url string, body []byte) (*http.Response, error) {
	return doJSONPostWithAPIKey(url, body, "")
}

func doJSONPostWithAPIKey(url string, body []byte, apiKey string) (*http.Response, error) {
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Key", resolveAPIKey(apiKey))
	return http.DefaultClient.Do(req)
}

func doJSONGet(url string) (*http.Response, error) {
	return doJSONGetWithAPIKey(url, "")
}

func doJSONGetWithAPIKey(url string, apiKey string) (*http.Response, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Key", resolveAPIKey(apiKey))
	return http.DefaultClient.Do(req)
}
