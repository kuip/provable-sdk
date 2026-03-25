package provable

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"golang.org/x/crypto/sha3"
)

type rewriteTransport struct {
	target *url.URL
	base   http.RoundTripper
}

func (rt *rewriteTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	clone := req.Clone(req.Context())
	clone.URL.Scheme = rt.target.Scheme
	clone.URL.Host = rt.target.Host
	clone.Host = rt.target.Host
	return rt.base.RoundTrip(clone)
}

func withKayrosServer(t *testing.T, handler http.HandlerFunc) {
	t.Helper()

	server := httptest.NewServer(handler)
	target, err := url.Parse(server.URL)
	if err != nil {
		t.Fatalf("Parse(server.URL) error = %v", err)
	}

	oldTransport := http.DefaultClient.Transport
	baseTransport := oldTransport
	if baseTransport == nil {
		baseTransport = http.DefaultTransport
	}
	http.DefaultClient.Transport = &rewriteTransport{
		target: target,
		base:   baseTransport,
	}

	t.Cleanup(func() {
		http.DefaultClient.Transport = oldTransport
		server.Close()
	})
}

func b64(hexValue string) string {
	raw, _ := hex.DecodeString(hexValue)
	return base64.StdEncoding.EncodeToString(raw)
}

func TestVerifyByKayrosHash(t *testing.T) {
	dataItem := strings.Repeat("11", 32)
	kayrosHash := strings.Repeat("22", 32)

	withKayrosServer(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case GetRecordByHashRoute:
			if got := r.Header.Get("X-User-Key"); got != "private-key-123" {
				t.Fatalf("X-User-Key = %q, want %q", got, "private-key-123")
			}
			if got := r.URL.Query().Get("data_type"); got != "proof_type" {
				t.Fatalf("data_type = %q, want %q", got, "proof_type")
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"data_item": b64(dataItem),
				"data_type": "proof_type",
				"hash_item": b64(kayrosHash),
				"hash_type": "sha256",
				"position":  3,
				"prev_hash": b64(strings.Repeat("00", 32)),
				"ts":        "123e4567-e89b-12d3-a456-426614174000",
			})
		case ComputeHashFromHexRoute:
			_ = json.NewEncoder(w).Encode(map[string]any{
				"hash":       kayrosHash,
				"hash_type":  "sha256",
				"input_size": 92,
			})
		default:
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
	})

	result := Verify(VerifyRequest{
		DataType:   "proof_type",
		DataItem:   dataItem,
		KayrosHash: kayrosHash,
		APIKey:     "private-key-123",
	})

	if result == nil || !result.Valid {
		t.Fatalf("Verify() = %#v, want valid result", result)
	}
	if result.Details == nil || !result.Details.RecordFound || !result.Details.RecordHashMatch {
		t.Fatalf("Verify() details = %#v", result.Details)
	}
}

func TestVerifyFailsOnAmbiguousDataItemLookup(t *testing.T) {
	dataItem := strings.Repeat("33", 32)

	withKayrosServer(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case GetRecordByDataItemRoute:
			_ = json.NewEncoder(w).Encode(map[string]any{
				"count": 2,
				"records": []map[string]any{
					{
						"data_item": b64(dataItem),
						"data_type": "proof_type",
						"hash_item": b64(strings.Repeat("44", 32)),
						"hash_type": "sha256",
						"position":  1,
						"prev_hash": b64(strings.Repeat("00", 32)),
						"ts":        "123e4567-e89b-12d3-a456-426614174000",
					},
					{
						"data_item": b64(dataItem),
						"data_type": "proof_type",
						"hash_item": b64(strings.Repeat("55", 32)),
						"hash_type": "sha256",
						"position":  2,
						"prev_hash": b64(strings.Repeat("44", 32)),
						"ts":        "123e4567-e89b-12d3-a456-426614174001",
					},
				},
			})
		default:
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
	})

	result := Verify(VerifyRequest{
		DataType: "proof_type",
		DataItem: dataItem,
	})

	if result == nil || result.Valid {
		t.Fatalf("Verify() = %#v, want invalid result", result)
	}
	if !strings.Contains(strings.ToLower(result.Error), "multiple records found") {
		t.Fatalf("Verify() error = %q", result.Error)
	}
}

func TestVerifyWithInclusion(t *testing.T) {
	dataItem := strings.Repeat("11", 32)
	kayrosHash := strings.Repeat("22", 32)
	siblingHash := strings.Repeat("33", 32)
	rootSum := sha3.Sum256(append(mustDecodeHex(kayrosHash), mustDecodeHex(siblingHash)...))
	rootHash := hex.EncodeToString(rootSum[:])

	withKayrosServer(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case GetRecordByHashRoute:
			_ = json.NewEncoder(w).Encode(map[string]any{
				"data_item": b64(dataItem),
				"data_type": "proof_type",
				"hash_item": b64(kayrosHash),
				"hash_type": "sha256",
				"position":  0,
				"prev_hash": b64(strings.Repeat("00", 32)),
				"ts":        "123e4567-e89b-12d3-a456-426614174000",
			})
		case ComputeHashFromHexRoute:
			_ = json.NewEncoder(w).Encode(map[string]any{
				"hash":       kayrosHash,
				"hash_type":  "sha256",
				"input_size": 92,
			})
		case GetMerkleProofRoute:
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success":      true,
				"data_type":    "proof_type",
				"hash_item":    kayrosHash,
				"proof":        []string{kayrosHash, siblingHash, rootHash},
				"root":         rootHash,
				"position":     0,
				"levels":       2,
				"level_counts": []int{2, 1},
				"level_starts": []int{0, 0},
			})
		case VerifyHashExistenceRoute:
			var req VerifyHashExistenceRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				t.Fatalf("Decode request error = %v", err)
			}
			foundHash := rootHash
			if req.Level == 0 {
				foundHash = kayrosHash
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"exists":     true,
				"level":      req.Level,
				"position":   req.Position,
				"data_type":  req.DataType,
				"found_hash": foundHash,
				"message":    "ok",
			})
		case VerifyHashBatchRoute:
			var req VerifyHashBatchRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				t.Fatalf("Decode request error = %v", err)
			}
			results := make([]int, len(req.Hashes))
			for i := range results {
				results[i] = 1
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"data_type":  req.DataType,
				"level":      req.Level,
				"start":      req.Start,
				"count":      len(req.Hashes),
				"results":    results,
				"matches":    len(req.Hashes),
				"mismatches": 0,
			})
		default:
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
	})

	result := VerifyWithInclusion(VerifyWithInclusionRequest{
		VerifyRequest: VerifyRequest{
			DataType:   "proof_type",
			KayrosHash: kayrosHash,
			APIKey:     "private-key-456",
		},
		TrustedRootHash:      rootHash,
		TrustedLevel:         intPtr(1),
		TrustedPosition:      intPtr(0),
		VerifyBatchExistence: true,
		LevelChecks: []VerifyLevelCheck{
			{Level: 0, Position: 0},
		},
	})

	if result == nil || !result.Valid {
		t.Fatalf("VerifyWithInclusion() = %#v, want valid result", result)
	}
	if result.Details == nil || !result.Details.ProofPathMatch || !result.Details.BatchExistenceMatch || !result.Details.TrustedLevelMatch {
		t.Fatalf("VerifyWithInclusion() details = %#v", result.Details)
	}
	if result.Details.LevelsHashType != "sha3-256" {
		t.Fatalf("VerifyWithInclusion() levels hash type = %q, want %q", result.Details.LevelsHashType, "sha3-256")
	}
	if len(result.Details.LevelChecks) != 1 || !result.Details.LevelChecks[0].Valid {
		t.Fatalf("VerifyWithInclusion() level checks = %#v", result.Details.LevelChecks)
	}
}

func TestVerifyWithInclusionSupportsSHA256Override(t *testing.T) {
	dataItem := strings.Repeat("11", 32)
	kayrosHash := strings.Repeat("22", 32)
	siblingHash := strings.Repeat("33", 32)
	rootSum := sha256.Sum256(append(mustDecodeHex(kayrosHash), mustDecodeHex(siblingHash)...))
	rootHash := hex.EncodeToString(rootSum[:])

	withKayrosServer(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case GetRecordByHashRoute:
			_ = json.NewEncoder(w).Encode(map[string]any{
				"data_item": b64(dataItem),
				"data_type": "proof_type",
				"hash_item": b64(kayrosHash),
				"hash_type": "sha256",
				"position":  0,
				"prev_hash": b64(strings.Repeat("00", 32)),
				"ts":        "123e4567-e89b-12d3-a456-426614174000",
			})
		case ComputeHashFromHexRoute:
			_ = json.NewEncoder(w).Encode(map[string]any{
				"hash":       kayrosHash,
				"hash_type":  "sha256",
				"input_size": 92,
			})
		case GetMerkleProofRoute:
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success":      true,
				"data_type":    "proof_type",
				"hash_item":    kayrosHash,
				"proof":        []string{kayrosHash, siblingHash, rootHash},
				"root":         rootHash,
				"position":     0,
				"levels":       2,
				"level_counts": []int{2, 1},
				"level_starts": []int{0, 0},
			})
		default:
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
	})

	result := VerifyWithInclusion(VerifyWithInclusionRequest{
		VerifyRequest: VerifyRequest{
			DataType:   "proof_type",
			KayrosHash: kayrosHash,
		},
		LevelsHashType: "sha256",
	})

	if result == nil || !result.Valid {
		t.Fatalf("VerifyWithInclusion() = %#v, want valid result", result)
	}
	if result.Details == nil || !result.Details.ProofPathMatch {
		t.Fatalf("VerifyWithInclusion() details = %#v", result.Details)
	}
	if result.Details.LevelsHashType != "sha256" {
		t.Fatalf("VerifyWithInclusion() levels hash type = %q, want %q", result.Details.LevelsHashType, "sha256")
	}
}

func mustDecodeHex(value string) []byte {
	decoded, err := hex.DecodeString(value)
	if err != nil {
		panic(err)
	}
	return decoded
}

func intPtr(value int) *int {
	return &value
}
