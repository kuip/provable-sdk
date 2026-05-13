package provable

import "fmt"

func NormalizeMerkleProof(input any) (*NormalizedMerkleProof, error) {
	switch value := input.(type) {
	case *NormalizedMerkleProof:
		if value == nil {
			return nil, fmt.Errorf("invalid merkle proof")
		}
		copyProof := append([]string(nil), value.Proof...)
		copyCounts := append([]int(nil), value.LevelCounts...)
		copyStarts := append([]int64(nil), value.LevelStarts...)
		return &NormalizedMerkleProof{
			DataType:    value.DataType,
			HashItem:    value.HashItem,
			Proof:       copyProof,
			Root:        value.Root,
			Position:    value.Position,
			Levels:      value.Levels,
			LevelCounts: copyCounts,
			LevelStarts: copyStarts,
			Raw:         value.Raw,
		}, nil
	case NormalizedMerkleProof:
		return NormalizeMerkleProof(&value)
	case *MerkleProofResponse:
		return normalizeMerkleProof(value)
	case MerkleProofResponse:
		return normalizeMerkleProof(&value)
	default:
		return nil, fmt.Errorf("unsupported merkle proof input type %T", input)
	}
}

func GetMerkleProofLevels(input any) ([]MerkleProofLevel, error) {
	proof, err := NormalizeMerkleProof(input)
	if err != nil {
		return nil, err
	}
	levelCounts, err := normalizeLevelCounts(proof.LevelCounts, proof.Levels, len(proof.Proof))
	if err != nil {
		return nil, err
	}

	levels := make([]MerkleProofLevel, 0, len(levelCounts))
	offset := 0
	for level, count := range levelCounts {
		start := defaultLevelStart(proof.Position, level, count)
		if level < len(proof.LevelStarts) {
			start = proof.LevelStarts[level]
		}
		hashes := append([]string(nil), proof.Proof[offset:offset+count]...)
		levels = append(levels, MerkleProofLevel{
			Level:  level,
			Start:  start,
			Count:  count,
			Hashes: hashes,
		})
		offset += count
	}
	return levels, nil
}

func CheckMerkleProofCompatibility(previousInput, nextInput any) (*MerkleProofCompatibilityResult, error) {
	previous, err := NormalizeMerkleProof(previousInput)
	if err != nil {
		return nil, err
	}
	next, err := NormalizeMerkleProof(nextInput)
	if err != nil {
		return nil, err
	}

	previousLevels, err := GetMerkleProofLevels(previous)
	if err != nil {
		return nil, err
	}
	nextLevels, err := GetMerkleProofLevels(next)
	if err != nil {
		return nil, err
	}

	mismatches := make([]MerkleProofCompatibilityMismatch, 0)
	if previous.DataType != next.DataType {
		mismatches = append(mismatches, MerkleProofCompatibilityMismatch{
			Kind:    "data_type",
			Message: fmt.Sprintf("data_type mismatch previous=%s next=%s", previous.DataType, next.DataType),
		})
	}
	if previous.HashItem != next.HashItem {
		mismatches = append(mismatches, MerkleProofCompatibilityMismatch{
			Kind:         "hash_item",
			PreviousHash: previous.HashItem,
			NextHash:     next.HashItem,
			Message:      fmt.Sprintf("hash_item mismatch previous=%s next=%s", previous.HashItem, next.HashItem),
		})
	}
	if previous.Position != next.Position {
		mismatches = append(mismatches, MerkleProofCompatibilityMismatch{
			Kind:             "position",
			PreviousPosition: previous.Position,
			NextPosition:     next.Position,
			Message:          fmt.Sprintf("position mismatch previous=%d next=%d", previous.Position, next.Position),
		})
	}

	type nextEntry struct {
		hash  string
		index int
	}
	nextLevelMaps := make(map[int]map[int64]nextEntry, len(nextLevels))
	for _, level := range nextLevels {
		entries := make(map[int64]nextEntry, len(level.Hashes))
		for index, hash := range level.Hashes {
			entries[level.Start+int64(index)] = nextEntry{hash: hash, index: index}
		}
		nextLevelMaps[level.Level] = entries
	}

	checkedEntries := 0
	for _, previousLevel := range previousLevels {
		nextLevel, ok := nextLevelMaps[previousLevel.Level]
		if !ok {
			mismatches = append(mismatches, MerkleProofCompatibilityMismatch{
				Kind:    "missing_level",
				Level:   previousLevel.Level,
				Message: fmt.Sprintf("missing level=%d in new proof", previousLevel.Level),
			})
			continue
		}
		for previousIndex, previousHash := range previousLevel.Hashes {
			position := previousLevel.Start + int64(previousIndex)
			nextHashEntry, ok := nextLevel[position]
			if !ok {
				mismatches = append(mismatches, MerkleProofCompatibilityMismatch{
					Kind:          "missing_position",
					Level:         previousLevel.Level,
					Position:      position,
					PreviousIndex: previousIndex,
					PreviousHash:  previousHash,
					Message:       fmt.Sprintf("missing level=%d position=%d in new proof", previousLevel.Level, position),
				})
				continue
			}
			checkedEntries += 1
			if nextHashEntry.hash != previousHash {
				mismatches = append(mismatches, MerkleProofCompatibilityMismatch{
					Kind:          "hash_mismatch",
					Level:         previousLevel.Level,
					Position:      position,
					PreviousIndex: previousIndex,
					NextIndex:     nextHashEntry.index,
					PreviousHash:  previousHash,
					NextHash:      nextHashEntry.hash,
					Message:       fmt.Sprintf("hash mismatch level=%d position=%d previous=%s next=%s", previousLevel.Level, position, previousHash, nextHashEntry.hash),
				})
			}
		}
	}

	return &MerkleProofCompatibilityResult{
		Compatible:     len(mismatches) == 0,
		CheckedEntries: checkedEntries,
		Previous:       previous,
		Next:           next,
		PreviousLevels: previousLevels,
		NextLevels:     nextLevels,
		Mismatches:     mismatches,
	}, nil
}

func defaultLevelStart(position int64, level int, count int) int64 {
	levelPosition := positionAtLevel(position, level)
	if count <= 0 {
		return levelPosition
	}
	return (levelPosition / int64(count)) * int64(count)
}

func positionAtLevel(position int64, level int) int64 {
	current := position
	for i := 0; i < level; i++ {
		current /= 256
	}
	return current
}
