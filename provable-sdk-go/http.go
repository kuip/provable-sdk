package provable

import (
	"bytes"
	"net/http"
)

func doJSONPost(url string, body []byte) (*http.Response, error) {
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Key", GetUserKey())
	return http.DefaultClient.Do(req)
}

func doJSONGet(url string) (*http.Response, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Key", GetUserKey())
	return http.DefaultClient.Do(req)
}
