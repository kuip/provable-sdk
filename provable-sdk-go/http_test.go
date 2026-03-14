package provable

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestDoJSONGetWithAPIKey(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-User-Key"); got != "private-key-123" {
			t.Fatalf("X-User-Key = %q, want %q", got, "private-key-123")
		}
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, `{"ok":true}`)
	}))
	defer server.Close()

	resp, err := doJSONGetWithAPIKey(server.URL, "private-key-123")
	if err != nil {
		t.Fatalf("doJSONGetWithAPIKey() error = %v", err)
	}
	defer resp.Body.Close()
}

func TestDoJSONGetUsesConfiguredAPIKey(t *testing.T) {
	SetAPIKey(DefaultAPIKey)
	t.Cleanup(func() {
		SetAPIKey(DefaultAPIKey)
	})

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-User-Key"); got != "global-key-456" {
			t.Fatalf("X-User-Key = %q, want %q", got, "global-key-456")
		}
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, `{"ok":true}`)
	}))
	defer server.Close()

	SetAPIKey("global-key-456")

	resp, err := doJSONGet(server.URL)
	if err != nil {
		t.Fatalf("doJSONGet() error = %v", err)
	}
	defer resp.Body.Close()
}
