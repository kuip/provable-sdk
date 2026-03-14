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
	return VerifyWithOptions(envelope, nil)
}

// VerifyWithOptions verifies data against a Kayros proof with explicit request options.
func VerifyWithOptions(envelope *KayrosEnvelope, opts *VerifyOptions) *VerifyResult {
	dataHash := strings.ToLower(envelope.GetDataHash())

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
	computedHash = strings.ToLower(computedHash)

	// Check if hashes match
	hashMatch := computedHash == dataHash

	if !hashMatch {
		return &VerifyResult{
			Valid: false,
			Error: fmt.Sprintf("Hash mismatch: computed=%s expected=%s", computedHash, dataHash),
			Details: &VerifyResultDetails{
				HashMatch:    false,
				ComputedHash: computedHash,
				DataHash:     dataHash,
			},
		}
	}

	// If there's a Kayros hash, verify against remote record.
	kayrosHash := envelope.GetKayrosHash()
	dataTypeCandidates := envelope.GetDataTypeLookupCandidates()
	if kayrosHash != "" {
		// Fetch remote record with retry logic and data_type fallbacks.
		var remoteRecord *GetRecordResponse
		var err error
		delays := []time.Duration{1 * time.Second, 2 * time.Second, 2 * time.Second}
		overrideCandidates := []string(nil)
		apiKey := ""
		if opts != nil {
			overrideCandidates = opts.DataTypes
			apiKey = opts.APIKey
		}
		lookupCandidates := mergeLookupCandidates(overrideCandidates, dataTypeCandidates)

		for _, dataType := range lookupCandidates {
			for i := 0; i < len(delays); i++ {
				remoteRecord, err = GetRecordByHashWithOptions(kayrosHash, &RequestOptions{
					DataType:     dataType,
					OmitDataType: dataType == "",
					APIKey:       apiKey,
				})
				if err == nil {
					break
				}
				time.Sleep(delays[i])
			}
			if err == nil {
				break
			}
		}
		if err != nil || remoteRecord == nil {
			return &VerifyResult{
				Valid: false,
				Error: fmt.Sprintf("Failed to fetch remote record: %v", err),
				Details: &VerifyResultDetails{
					HashMatch:    true,
					ComputedHash: computedHash,
					DataHash:     dataHash,
				},
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
					DataHash:     dataHash,
				},
			}
		}
		remoteDataItemHex = strings.ToLower(remoteDataItemHex)
		remoteMatch := computedHash == remoteDataItemHex

		if !remoteMatch {
			return &VerifyResult{
				Valid: false,
				Error: "Remote verification failed: hash does not match remote record",
				Details: &VerifyResultDetails{
					HashMatch:    true,
					RemoteMatch:  false,
					ComputedHash: computedHash,
					DataHash:     dataHash,
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
				DataHash:     dataHash,
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
			DataHash:     dataHash,
		},
	}
}
