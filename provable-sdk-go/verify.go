package provable

import (
	"encoding/base64"
	"fmt"
	"strings"
	"time"
)

func normalizeRemoteDataItemHex(value string) string {
	if value == "" {
		return ""
	}

	decoded, err := base64.StdEncoding.DecodeString(value)
	if err != nil {
		decoded, err = base64.URLEncoding.DecodeString(value)
		if err != nil {
			decoded = nil
		}
	}

	if decoded != nil {
		decodedText := string(decoded)
		if isHex64(decodedText) {
			return strings.ToLower(decodedText)
		}

		if len(decoded) == 32 {
			return fmt.Sprintf("%x", decoded)
		}
	}

	if isHex64(value) {
		return strings.ToLower(value)
	}

	return ""
}

func isHex64(value string) bool {
	if len(value) != 64 {
		return false
	}
	for _, c := range value {
		if (c < '0' || c > '9') && (c < 'a' || c > 'f') && (c < 'A' || c > 'F') {
			return false
		}
	}
	return true
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

	computedHash, err := envelope.ComputeDataHash()
	if err != nil {
		return &VerifyResult{
			Valid: false,
			Error: fmt.Sprintf("Failed to compute data hash: %v", err),
		}
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
	dataType := envelope.GetDataTypeLabel()
	if kayrosHash != "" {
		// Fetch remote record with retry logic
		var remoteRecord *GetRecordResponse
		var err error

		remoteRecord, err = GetRecordByHash(kayrosHash, dataType)
		if err != nil {
			// Retry once after 2 seconds
			time.Sleep(2 * time.Second)
			remoteRecord, err = GetRecordByHash(kayrosHash, dataType)
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

		remoteDataItemHex := remoteRecord.DataItemHex
		if remoteDataItemHex == "" && remoteRecord.DataItem != "" {
			remoteDataItemHex = normalizeRemoteDataItemHex(remoteRecord.DataItem)
		}
		remoteDataItemHex = normalizeRemoteDataItemHex(remoteDataItemHex)
		if remoteDataItemHex == "" {
			return &VerifyResult{
				Valid: false,
				Error: "Invalid remote record structure",
				Details: &VerifyResultDetails{
					HashMatch:    true,
					ComputedHash: computedHash,
					DataHash: dataHash,
				},
			}
		}
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
