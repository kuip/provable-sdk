package provable

import (
	"encoding/json"
	"fmt"
	"time"
)

// Verify verifies data against a Kayros proof
func Verify(envelope *KayrosEnvelope) *VerifyResult {
	// Validate envelope structure
	if envelope.Kayros.Hash == "" {
		return &VerifyResult{
			Valid: false,
			Error: "Missing field: envelope.kayros.hash",
		}
	}

	// Compute hash of the data (stringify as JSON for struct/map data)
	var dataString string
	if str, ok := envelope.Data.(string); ok {
		dataString = str
	} else {
		jsonData, err := json.Marshal(envelope.Data)
		if err != nil {
			return &VerifyResult{
				Valid: false,
				Error: fmt.Sprintf("Failed to marshal data: %v", err),
			}
		}
		dataString = string(jsonData)
	}

	computedHash := Keccak256Str(dataString)
	envelopeHash := envelope.Kayros.Hash

	// Check if hashes match
	hashMatch := computedHash == envelopeHash

	if !hashMatch {
		return &VerifyResult{
			Valid: false,
			Error: "Hash mismatch: computed hash does not match envelope hash",
			Details: &VerifyResultDetails{
				HashMatch:    false,
				ComputedHash: computedHash,
				EnvelopeHash: envelopeHash,
			},
		}
	}

	// If there's a timestamp, verify against remote record
	if envelope.Kayros.Timestamp != nil {
		timestampResponse, ok := envelope.Kayros.Timestamp.Response.(map[string]interface{})
		if !ok {
			return &VerifyResult{
				Valid: false,
				Error: "Invalid timestamp response structure",
				Details: &VerifyResultDetails{
					HashMatch:    true,
					ComputedHash: computedHash,
					EnvelopeHash: envelopeHash,
				},
			}
		}

		data, ok := timestampResponse["data"].(map[string]interface{})
		if !ok {
			return &VerifyResult{
				Valid: false,
				Error: "Invalid timestamp response structure: missing data",
				Details: &VerifyResultDetails{
					HashMatch:    true,
					ComputedHash: computedHash,
					EnvelopeHash: envelopeHash,
				},
			}
		}

		remoteHash, ok := data["computed_hash_hex"].(string)
		if !ok {
			return &VerifyResult{
				Valid: false,
				Error: "Invalid timestamp response structure: missing computed_hash_hex",
				Details: &VerifyResultDetails{
					HashMatch:    true,
					ComputedHash: computedHash,
					EnvelopeHash: envelopeHash,
				},
			}
		}

		// Fetch remote record with retry logic
		var remoteRecord *GetRecordResponse
		var err error

		remoteRecord, err = GetRecordByHash(remoteHash)
		if err != nil {
			// Retry once after 2 seconds
			time.Sleep(2 * time.Second)
			remoteRecord, err = GetRecordByHash(remoteHash)
			if err != nil {
				return &VerifyResult{
					Valid: false,
					Error: fmt.Sprintf("Failed to fetch remote record: %v", err),
					Details: &VerifyResultDetails{
						HashMatch:    true,
						ComputedHash: computedHash,
						EnvelopeHash: envelopeHash,
					},
				}
			}
		}

		remoteDataItemHex := remoteRecord.Data.DataItemHex
		remoteMatch := computedHash == remoteDataItemHex

		if !remoteMatch {
			return &VerifyResult{
				Valid: false,
				Error: "Remote verification failed: hash does not match remote record",
				Details: &VerifyResultDetails{
					HashMatch:    true,
					RemoteMatch:  false,
					ComputedHash: computedHash,
					EnvelopeHash: envelopeHash,
					RemoteHash:   remoteDataItemHex,
				},
			}
		}

		return &VerifyResult{
			Valid: true,
			Details: &VerifyResultDetails{
				HashMatch:    true,
				RemoteMatch:  true,
				ComputedHash: computedHash,
				EnvelopeHash: envelopeHash,
				RemoteHash:   remoteDataItemHex,
			},
		}
	}

	// No timestamp, just verify local hash match
	return &VerifyResult{
		Valid: true,
		Details: &VerifyResultDetails{
			HashMatch:    true,
			ComputedHash: computedHash,
			EnvelopeHash: envelopeHash,
		},
	}
}
