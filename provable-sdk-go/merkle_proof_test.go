package provable

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func loadMerkleProofFixture(t *testing.T, name string) *MerkleProofResponse {
	t.Helper()

	path := filepath.Join("..", "testdata", name)
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile(%s) error: %v", path, err)
	}

	var proof MerkleProofResponse
	if err := json.Unmarshal(data, &proof); err != nil {
		t.Fatalf("json.Unmarshal(%s) error: %v", path, err)
	}

	return &proof
}

func loadRecordFixture(t *testing.T, name string) *GetRecordResponse {
	t.Helper()

	path := filepath.Join("..", "testdata", name)
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile(%s) error: %v", path, err)
	}

	var record GetRecordResponse
	if err := json.Unmarshal(data, &record); err != nil {
		t.Fatalf("json.Unmarshal(%s) error: %v", path, err)
	}

	return &record
}

func loadProofFixtures(t *testing.T) (*GetRecordResponse, []*MerkleProofResponse) {
	t.Helper()

	record := loadRecordFixture(t, "proof1_record.json")
	proofs := []*MerkleProofResponse{
		loadMerkleProofFixture(t, "proof1_merkle_1.json"),
		loadMerkleProofFixture(t, "proof1_merkle_2.json"),
		loadMerkleProofFixture(t, "proof1_merkle_3.json"),
		loadMerkleProofFixture(t, "proof1_merkle_4.json"),
	}

	return record, proofs
}

func TestRealMerkleProofsBelongToSameRecord(t *testing.T) {
	record, proofs := loadProofFixtures(t)

	for _, proof := range proofs {
		if proof.DataType != record.DataType {
			t.Fatalf("DataType = %s, want %s", proof.DataType, record.DataType)
		}
		if proof.HashItem != record.HashItem {
			t.Fatalf("HashItem = %s, want %s", proof.HashItem, record.HashItem)
		}
		if proof.Position != record.Position {
			t.Fatalf("Position = %d, want %d", proof.Position, record.Position)
		}
	}
}

func TestNormalizeMerkleProofWithRealFixture(t *testing.T) {
	_, proofs := loadProofFixtures(t)

	proof, err := NormalizeMerkleProof(proofs[0])
	if err != nil {
		t.Fatalf("NormalizeMerkleProof error: %v", err)
	}
	if len(proof.Proof) != 294 {
		t.Fatalf("len(Proof) = %d, want 294", len(proof.Proof))
	}
	if len(proof.LevelCounts) != 2 || proof.LevelCounts[0] != 160 || proof.LevelCounts[1] != 134 {
		t.Fatalf("LevelCounts = %+v, want [160 134]", proof.LevelCounts)
	}
	if len(proof.LevelStarts) != 2 || proof.LevelStarts[0] != 99840 || proof.LevelStarts[1] != 256 {
		t.Fatalf("LevelStarts = %+v, want [99840 256]", proof.LevelStarts)
	}
}

func TestGetMerkleProofLevelsWithRealFixtures(t *testing.T) {
	_, proofs := loadProofFixtures(t)

	normalizedV1, err := NormalizeMerkleProof(proofs[0])
	if err != nil {
		t.Fatalf("NormalizeMerkleProof error: %v", err)
	}
	levelsV1, err := GetMerkleProofLevels(proofs[0])
	if err != nil {
		t.Fatalf("GetMerkleProofLevels error: %v", err)
	}
	if len(levelsV1) != 2 {
		t.Fatalf("len(levelsV1) = %d, want 2", len(levelsV1))
	}
	if levelsV1[0].Start != 99840 || levelsV1[0].Count != 160 {
		t.Fatalf("level 0 metadata = %+v", levelsV1[0])
	}
	if levelsV1[1].Start != 256 || levelsV1[1].Count != 134 {
		t.Fatalf("level 1 metadata = %+v", levelsV1[1])
	}
	if len(levelsV1[0].Hashes) != 160 || len(levelsV1[1].Hashes) != 134 {
		t.Fatalf("level hashes lengths = [%d %d], want [160 134]", len(levelsV1[0].Hashes), len(levelsV1[1].Hashes))
	}
	if levelsV1[0].Hashes[0] != normalizedV1.Proof[0] || levelsV1[1].Hashes[0] != normalizedV1.Proof[160] {
		t.Fatalf("level hashes do not align with normalized proof slices")
	}

	levelsV4, err := GetMerkleProofLevels(proofs[3])
	if err != nil {
		t.Fatalf("GetMerkleProofLevels error: %v", err)
	}
	if len(levelsV4) != 3 {
		t.Fatalf("len(levelsV4) = %d, want 3", len(levelsV4))
	}
	want := []struct {
		level int
		start int64
		count int
	}{
		{level: 0, start: 99840, count: 256},
		{level: 1, start: 256, count: 256},
		{level: 2, start: 1, count: 1},
	}
	for i, level := range levelsV4 {
		if level.Level != want[i].level || level.Start != want[i].start || level.Count != want[i].count {
			t.Fatalf("levelsV4[%d] = %+v, want level=%d start=%d count=%d", i, level, want[i].level, want[i].start, want[i].count)
		}
	}
}

func TestCheckMerkleProofCompatibilityAcceptsRealGrowthChain(t *testing.T) {
	_, proofs := loadProofFixtures(t)

	cases := [][2]int{
		{0, 1},
		{1, 2},
		{2, 3},
		{0, 3},
	}

	for _, pair := range cases {
		result, err := CheckMerkleProofCompatibility(proofs[pair[0]], proofs[pair[1]])
		if err != nil {
			t.Fatalf("CheckMerkleProofCompatibility(%d,%d) error: %v", pair[0], pair[1], err)
		}
		if !result.Compatible {
			t.Fatalf("Compatible = false for pair %v, mismatches = %+v", pair, result.Mismatches)
		}
		if result.CheckedEntries != len(proofs[pair[0]].Proof) {
			t.Fatalf("CheckedEntries = %d, want %d for pair %v", result.CheckedEntries, len(proofs[pair[0]].Proof), pair)
		}
		if len(result.Mismatches) != 0 {
			t.Fatalf("Mismatches = %+v, want none", result.Mismatches)
		}
	}
}

func TestCheckMerkleProofCompatibilityReportsRealReverseMismatches(t *testing.T) {
	_, proofs := loadProofFixtures(t)

	result, err := CheckMerkleProofCompatibility(proofs[3], proofs[0])
	if err != nil {
		t.Fatalf("CheckMerkleProofCompatibility error: %v", err)
	}
	if result.Compatible {
		t.Fatalf("Compatible = true, want false")
	}
	if result.CheckedEntries != 294 {
		t.Fatalf("CheckedEntries = %d, want 294", result.CheckedEntries)
	}

	var foundLevel0, foundLevel1, foundLevel2 bool
	for _, mismatch := range result.Mismatches {
		if mismatch.Kind == "missing_position" && mismatch.Level == 0 && mismatch.Position == 100000 && mismatch.PreviousIndex == 160 {
			foundLevel0 = true
		}
		if mismatch.Kind == "missing_position" && mismatch.Level == 1 && mismatch.Position == 390 && mismatch.PreviousIndex == 134 {
			foundLevel1 = true
		}
		if mismatch.Kind == "missing_level" && mismatch.Level == 2 {
			foundLevel2 = true
		}
	}
	if !foundLevel0 || !foundLevel1 || !foundLevel2 {
		t.Fatalf("Mismatches = %+v, want missing positions at level 0 and 1 plus missing level 2", result.Mismatches)
	}
}
