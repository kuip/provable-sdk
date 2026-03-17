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
	testDataType := "provable_sdk_tests"

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
	kayrosResponse, err := ProveSingleHash(dataHash, testDataType)
	if err != nil {
		t.Fatalf("ProveSingleHash failed: %v", err)
	}
	if kayrosResponse == nil {
		t.Fatal("kayrosResponse is nil")
	}
	if kayrosResponse.Hash == "" {
		t.Fatal("hash is empty")
	}
	if len(kayrosResponse.Hash) != 64 {
		t.Errorf("hash length = %d, want 64", len(kayrosResponse.Hash))
	}

	computedHash := kayrosResponse.Hash

	// Step 4: Verify the record directly against Kayros APIs.
	verifyResult := Verify(VerifyRequest{
		DataType:   testDataType,
		DataItem:   dataHash,
		KayrosHash: computedHash,
	})
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

	if verifyResult.Details == nil {
		t.Fatal("verifyResult.Details is nil")
	}
	if !verifyResult.Details.DataItemMatch || !verifyResult.Details.KayrosHashMatch || !verifyResult.Details.RecordHashMatch {
		t.Error("verification details do not match record inputs")
	}
	if verifyResult.Details.Record == nil {
		t.Fatal("verifyResult.Details.Record is nil")
	}
	if verifyResult.Details.Record.DataItem != dataHash {
		t.Errorf("record data_item = %v, want %v", verifyResult.Details.Record.DataItem, dataHash)
	}
	if verifyResult.Details.Record.KayrosHash != computedHash {
		t.Errorf("record kayros_hash = %v, want %v", verifyResult.Details.Record.KayrosHash, computedHash)
	}

	// Step 6: Verify we can retrieve the record by hash using the computed hash from Kayros
	record, err := GetRecordByHash(computedHash, testDataType)
	if err != nil {
		t.Fatalf("GetRecordByHash failed: %v", err)
	}
	if record == nil {
		t.Fatal("record is nil")
	}
	if record.DataItemHex != dataHash {
		t.Errorf("data_item_hex = %v, want %v", record.DataItemHex, dataHash)
	}
}
