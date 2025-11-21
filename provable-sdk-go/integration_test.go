package provable

import (
	"fmt"
	"regexp"
	"testing"
	"time"
)

// TestFullCycleIntegration tests the complete cycle:
// data -> hash -> index with Kayros -> build proof -> verify
func TestFullCycleIntegration(t *testing.T) {
	// Step 1: Start with test data
	testData := fmt.Sprintf("Integration test data %d", time.Now().UnixMilli())

	// Step 2: Hash the data
	dataHash := Keccak256Str(testData)
	if len(dataHash) != 64 {
		t.Fatalf("Hash length = %d, want 64", len(dataHash))
	}
	matched, _ := regexp.MatchString("^[0-9a-f]{64}$", dataHash)
	if !matched {
		t.Fatal("Hash is not valid hex string")
	}

	// Step 3: Index with Kayros (prove the hash)
	kayrosResponse, err := ProveSingleHash(dataHash)
	if err != nil {
		t.Fatalf("ProveSingleHash failed: %v", err)
	}
	if kayrosResponse == nil {
		t.Fatal("kayrosResponse is nil")
	}
	if kayrosResponse.Data.ComputedHashHex == "" {
		t.Fatal("computed_hash_hex is empty")
	}
	if len(kayrosResponse.Data.ComputedHashHex) != 64 {
		t.Errorf("computed_hash_hex length = %d, want 64", len(kayrosResponse.Data.ComputedHashHex))
	}

	computedHash := kayrosResponse.Data.ComputedHashHex

	// Step 4: Build proof object (envelope)
	envelope := &KayrosEnvelope{
		Data: testData,
		Kayros: KayrosMetadata{
			Hash:          dataHash,
			HashAlgorithm: "keccak256",
			Timestamp: &KayrosTimestamp{
				Service:  "kayros",
				Response: kayrosResponse,
			},
		},
	}

	// Step 5: Verify the proof
	verifyResult := Verify(envelope)
	if verifyResult == nil {
		t.Fatal("verifyResult is nil")
	}

	// Verify result is valid
	if !verifyResult.Valid {
		t.Errorf("Verification failed: %v", verifyResult.Error)
	}
	if verifyResult.Error != "" {
		t.Errorf("Unexpected error: %v", verifyResult.Error)
	}

	// Verify hash matches
	if verifyResult.Details == nil {
		t.Fatal("verifyResult.Details is nil")
	}
	if !verifyResult.Details.HashMatch {
		t.Error("Hash does not match")
	}
	if verifyResult.Details.ComputedHash != dataHash {
		t.Errorf("computedHash = %v, want %v", verifyResult.Details.ComputedHash, dataHash)
	}
	if verifyResult.Details.EnvelopeHash != dataHash {
		t.Errorf("envelopeHash = %v, want %v", verifyResult.Details.EnvelopeHash, dataHash)
	}

	// Verify remote record exists and matches
	if !verifyResult.Details.RemoteMatch {
		t.Error("Remote record does not match")
	}
	if verifyResult.Details.RemoteHash != dataHash {
		t.Errorf("remoteHash = %v, want %v", verifyResult.Details.RemoteHash, dataHash)
	}

	// Step 6: Verify we can retrieve the record by hash using the computed hash from Kayros
	record, err := GetRecordByHash(computedHash)
	if err != nil {
		t.Fatalf("GetRecordByHash failed: %v", err)
	}
	if record == nil {
		t.Fatal("record is nil")
	}
	if record.Data.DataItemHex != dataHash {
		t.Errorf("data_item_hex = %v, want %v", record.Data.DataItemHex, dataHash)
	}
}
