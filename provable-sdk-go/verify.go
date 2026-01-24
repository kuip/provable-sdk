package provable

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// computeHashStr computes a hash of a string using the specified algorithm
func computeHashStr(data string, algorithm string) string {
	normalizedAlgorithm := strings.ToLower(algorithm)
	if normalizedAlgorithm == "" {
		normalizedAlgorithm = "sha256"
	}

	if normalizedAlgorithm == "keccak256" || normalizedAlgorithm == "keccak-256" {
		return Keccak256Str(data)
	}

	// Default to sha256 for 'sha256', 'sha-256', or any other value
	return SHA256Str(data)
}

// computeHashBytes computes a hash of bytes using the specified algorithm
func computeHashBytes(data []byte, algorithm string) string {
	normalizedAlgorithm := strings.ToLower(algorithm)
	if normalizedAlgorithm == "" {
		normalizedAlgorithm = "sha256"
	}

	if normalizedAlgorithm == "keccak256" || normalizedAlgorithm == "keccak-256" {
		return Keccak256(data)
	}

	// Default to sha256 for 'sha256', 'sha-256', or any other value
	return SHA256(data)
}

// Verify verifies data against a Kayros proof
func Verify(envelope *KayrosEnvelope) *VerifyResult {
	dataHash := envelope.GetDataHash()

	if dataHash == "" {
		return &VerifyResult{
			Valid: false,
			Error: "Missing hash in envelope",
		}
	}

	var computedHash string

	if envelope.IsV0() {
		// V0 format (legacy, used only for email proofs): data is base64 encoded, hash the decoded bytes
		dataStr, ok := envelope.Data.(string)
		if !ok {
			return &VerifyResult{
				Valid: false,
				Error: "V0 envelope data must be a base64 string",
			}
		}
		decodedBytes, err := base64.StdEncoding.DecodeString(dataStr)
		if err != nil {
			return &VerifyResult{
				Valid: false,
				Error: fmt.Sprintf("Failed to decode base64 data: %v", err),
			}
		}
		computedHash = computeHashBytes(decodedBytes, envelope.GetHashAlgorithm())
	} else {
		// V1 format: hash the string directly or JSON.stringify for objects
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
		computedHash = computeHashStr(dataString, envelope.GetHashAlgorithm())
	}

	// Check if hashes match
	hashMatch := computedHash == dataHash

	if !hashMatch {
		return &VerifyResult{
			Valid: false,
			Error: "Hash mismatch: computed hash does not match data hash",
			Details: &VerifyResultDetails{
				HashMatch:    false,
				ComputedHash: computedHash,
				DataHash: dataHash,
			},
		}
	}

	// If there's a Kayros hash, verify against remote record
	kayrosHash := envelope.GetKayrosHash()
	if kayrosHash != "" {
		// Fetch remote record with retry logic
		var remoteRecord *GetRecordResponse
		var err error

		remoteRecord, err = GetRecordByHash(kayrosHash)
		if err != nil {
			// Retry once after 2 seconds
			time.Sleep(2 * time.Second)
			remoteRecord, err = GetRecordByHash(kayrosHash)
			if err != nil {
				return &VerifyResult{
					Valid: false,
					Error: fmt.Sprintf("Failed to fetch remote record: %v", err),
					Details: &VerifyResultDetails{
						HashMatch:    true,
						ComputedHash: computedHash,
						DataHash: dataHash,
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
					DataHash: dataHash,
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
				DataHash: dataHash,
				RemoteHash:   remoteDataItemHex,
			},
		}
	}

	// No remote verification needed, just verify local hash match
	return &VerifyResult{
		Valid: true,
		Details: &VerifyResultDetails{
			HashMatch:    true,
			ComputedHash: computedHash,
			DataHash: dataHash,
		},
	}
}
