package provable

import (
	"fmt"
	"time"
)

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
