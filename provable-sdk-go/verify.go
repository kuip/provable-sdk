package provable

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const zeroHash32 = "0000000000000000000000000000000000000000000000000000000000000000"

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

type verifyCoreState struct {
	request VerifyRequest
	record  *NormalizedKayrosRecord
	details *VerifyResultDetails
}

// Verify validates a Kayros record using data_type plus either data_item or kayros_hash.
func Verify(request VerifyRequest) *VerifyResult {
	result, _ := verifyRecordCore(request)
	return result
}

// VerifyWithInclusion validates a Kayros record and its Merkle inclusion path.
func VerifyWithInclusion(request VerifyWithInclusionRequest) *VerifyResult {
	result, state := verifyRecordCore(request.VerifyRequest)
	if state == nil {
		return result
	}

	proofResp, err := getMerkleProofForVerify(state.request.DataType, state.record.KayrosHash, state.request.APIKey)
	if err != nil {
		return invalidResult(state.details, fmt.Sprintf("Failed to fetch merkle proof: %v", err))
	}

	proof, err := normalizeMerkleProof(proofResp)
	if err != nil {
		return invalidResult(state.details, err.Error())
	}

	state.details.ProofFetched = true
	state.details.Proof = proof
	state.details.ProofDataTypeMatch = proof.DataType == state.request.DataType || utf8Hex(proof.DataType) == utf8Hex(state.request.DataType)
	state.details.ProofHashItemMatch = proof.HashItem == state.record.KayrosHash
	if !state.details.ProofDataTypeMatch {
		return invalidResult(state.details, fmt.Sprintf("Proof data_type mismatch: expected=%s proof=%s", state.request.DataType, proof.DataType))
	}
	if !state.details.ProofHashItemMatch {
		return invalidResult(state.details, fmt.Sprintf("Proof hash_item mismatch: expected=%s proof=%s", state.record.KayrosHash, proof.HashItem))
	}

	levelCounts, err := normalizeLevelCounts(proof.LevelCounts, proof.Levels, len(proof.Proof))
	if err != nil {
		return invalidResult(state.details, err.Error())
	}

	pending, maxLevel, maxLevelPosition, maxLevelHash := proofInclusionMeta(proof, levelCounts)
	state.details.Pending = pending
	state.details.MaxLevel = maxLevel
	state.details.MaxLevelPosition = maxLevelPosition
	state.details.MaxLevelHash = maxLevelHash

	if err := verifyProofTargetPosition(proof, state.record.KayrosHash, levelCounts); err != nil {
		state.details.TargetPositionMatch = false
		return invalidResult(state.details, err.Error())
	}
	state.details.TargetPositionMatch = true

	if !pending {
		rootHash, err := verifyProofPath(proof, levelCounts)
		state.details.LocalRootHash = rootHash
		state.details.ProofPathMatch = err == nil
		if err != nil {
			return invalidResult(state.details, err.Error())
		}
	}

	trustedRootHash := normalizeHexString(request.TrustedRootHash)
	if !pending && trustedRootHash != "" {
		state.details.TrustedRootMatch = proof.Root == trustedRootHash
		if !state.details.TrustedRootMatch {
			return invalidResult(state.details, fmt.Sprintf("Root hash mismatch: proof=%s trusted=%s", proof.Root, trustedRootHash))
		}
	}

	if request.TrustedLevel != nil && request.TrustedPosition != nil {
		expectedHash := trustedRootHash
		if expectedHash == "" {
			expectedHash = proofHashAtLevelPosition(proof, levelCounts, *request.TrustedLevel, *request.TrustedPosition)
		}
		if expectedHash == "" {
			return invalidResult(state.details, fmt.Sprintf("Missing proof hash at level=%d position=%d", *request.TrustedLevel, *request.TrustedPosition))
		}
		resp, err := verifyHashExistenceForVerify(VerifyHashExistenceRequest{
			DataType: state.request.DataType,
			Level:    *request.TrustedLevel,
			Position: int64(*request.TrustedPosition),
			Hash:     expectedHash,
		}, state.request.APIKey)
		if err != nil {
			return invalidResult(state.details, fmt.Sprintf("Trusted level check failed: %v", err))
		}
		state.details.TrustedLevelMatch = resp.Exists && hashResponseMatches(expectedHash, resp.FoundHash)
		if !state.details.TrustedLevelMatch {
			message := resp.Message
			if message == "" {
				message = fmt.Sprintf("Trusted level check failed at level=%d position=%d", *request.TrustedLevel, *request.TrustedPosition)
			}
			return invalidResult(state.details, message)
		}
	}

	if len(request.LevelChecks) > 0 {
		checkResults := make([]LevelCheckResult, 0, len(request.LevelChecks))
		for _, check := range request.LevelChecks {
			expectedHash := normalizeHexString(check.Hash)
			if expectedHash == "" {
				expectedHash = proofHashAtLevelPosition(proof, levelCounts, check.Level, check.Position)
			}
			if expectedHash == "" {
				return invalidResult(state.details, fmt.Sprintf("Missing proof hash at level=%d position=%d", check.Level, check.Position))
			}

			resp, err := verifyHashExistenceForVerify(VerifyHashExistenceRequest{
				DataType: state.request.DataType,
				Level:    check.Level,
				Position: int64(check.Position),
				Hash:     expectedHash,
			}, state.request.APIKey)
			if err != nil {
				checkResults = append(checkResults, LevelCheckResult{
					Level:    check.Level,
					Position: check.Position,
					Hash:     expectedHash,
					Valid:    false,
					Message:  err.Error(),
				})
				state.details.LevelChecks = checkResults
				return invalidResult(state.details, fmt.Sprintf("Level check failed: %v", err))
			}

			valid := resp.Exists && hashResponseMatches(expectedHash, resp.FoundHash)
			checkResults = append(checkResults, LevelCheckResult{
				Level:     check.Level,
				Position:  check.Position,
				Hash:      expectedHash,
				Valid:     valid,
				Exists:    resp.Exists,
				FoundHash: normalizeHexString(resp.FoundHash),
				Message:   resp.Message,
			})
			if !valid {
				state.details.LevelChecks = checkResults
				message := resp.Message
				if message == "" {
					message = fmt.Sprintf("Level check failed at level=%d position=%d", check.Level, check.Position)
				}
				return invalidResult(state.details, message)
			}
		}
		state.details.LevelChecks = checkResults
	}

	if request.VerifyBatchExistence {
		batchChecks := make([]BatchExistenceCheckResult, 0, len(levelCounts))
		offset := 0
		for level, count := range levelCounts {
			hashes := proof.Proof[offset : offset+count]
			start := int64(0)
			if level < len(proof.LevelStarts) {
				start = proof.LevelStarts[level]
			}

			resp, err := verifyHashBatchForVerify(VerifyHashBatchRequest{
				DataType: state.request.DataType,
				Level:    level,
				Start:    start,
				Hashes:   hashes,
			}, state.request.APIKey)
			if err != nil {
				batchChecks = append(batchChecks, BatchExistenceCheckResult{
					Level:      level,
					Start:      start,
					Hashes:     hashes,
					Valid:      false,
					Mismatches: len(hashes),
				})
				state.details.BatchChecks = batchChecks
				state.details.BatchExistenceMatch = false
				return invalidResult(state.details, fmt.Sprintf("Batch existence check failed: %v", err))
			}

			valid := resp.Mismatches == 0
			for _, result := range resp.Results {
				if result != 1 {
					valid = false
					break
				}
			}
			batchChecks = append(batchChecks, BatchExistenceCheckResult{
				Level:      level,
				Start:      start,
				Hashes:     hashes,
				Valid:      valid,
				Results:    resp.Results,
				Matches:    resp.Matches,
				Mismatches: resp.Mismatches,
			})
			if !valid {
				state.details.BatchChecks = batchChecks
				state.details.BatchExistenceMatch = false
				return invalidResult(state.details, fmt.Sprintf("Batch existence check failed at level=%d", level))
			}
			offset += count
		}

		state.details.BatchChecks = batchChecks
		state.details.BatchExistenceMatch = true
	}

	return &VerifyResult{
		Valid:   true,
		Details: state.details,
	}
}

func verifyRecordCore(request VerifyRequest) (*VerifyResult, *verifyCoreState) {
	details := &VerifyResultDetails{
		LookupMode:  "data_item",
		RecordFound: false,
	}
	if request.KayrosHash != "" {
		details.LookupMode = "kayros_hash"
	}

	if strings.TrimSpace(request.DataType) == "" {
		return invalidResult(details, "Missing data_type"), nil
	}
	if strings.TrimSpace(request.DataItem) == "" && strings.TrimSpace(request.KayrosHash) == "" {
		return invalidResult(details, "Either data_item or kayros_hash is required"), nil
	}

	var record *NormalizedKayrosRecord
	var err error
	if request.KayrosHash != "" {
		recordResp, fetchErr := GetRecordByHashWithOptions(request.KayrosHash, &RequestOptions{
			DataType: request.DataType,
			APIKey:   request.APIKey,
		})
		if fetchErr != nil {
			return invalidResult(details, fmt.Sprintf("Failed to fetch record: %v", fetchErr)), nil
		}
		record, err = normalizeRecord(recordResp)
	} else {
		record, err = fetchRecordByDataItemForVerify(request.DataType, request.DataItem, request.APIKey)
	}
	if err != nil {
		return invalidResult(details, fmt.Sprintf("Failed to fetch record: %v", err)), nil
	}

	details.RecordFound = true
	details.Record = record
	details.DataTypeMatch = dataTypeMatches(record, request.DataType)
	if !details.DataTypeMatch {
		return invalidResult(details, fmt.Sprintf("Record data_type mismatch: expected=%s record=%s", request.DataType, record.DataType)), nil
	}

	if request.DataItem != "" {
		normalizedDataItem := normalizeHexString(request.DataItem)
		details.DataItemMatch = normalizedDataItem == record.DataItem
		if !details.DataItemMatch {
			expected := normalizedDataItem
			if expected == "" {
				expected = request.DataItem
			}
			return invalidResult(details, fmt.Sprintf("Record data_item mismatch: expected=%s record=%s", expected, record.DataItem)), nil
		}
	}

	if request.KayrosHash != "" {
		normalizedKayrosHash := normalizeHexString(request.KayrosHash)
		details.KayrosHashMatch = normalizedKayrosHash == record.KayrosHash
		if !details.KayrosHashMatch {
			expected := normalizedKayrosHash
			if expected == "" {
				expected = request.KayrosHash
			}
			return invalidResult(details, fmt.Sprintf("Record hash mismatch: expected=%s record=%s", expected, record.KayrosHash)), nil
		}
	}

	var previousRecord *NormalizedKayrosRecord
	if record.PrevHash != "" && !isZeroHash(record.PrevHash) {
		prevResp, fetchErr := GetRecordByHashWithOptions(record.PrevHash, &RequestOptions{
			DataType: record.DataType,
			APIKey:   request.APIKey,
		})
		if fetchErr != nil {
			return invalidResult(details, fmt.Sprintf("Failed to fetch previous record: %v", fetchErr)), nil
		}
		previousRecord, err = normalizeRecord(prevResp)
		if err != nil {
			return invalidResult(details, fmt.Sprintf("Failed to normalize previous record: %v", err)), nil
		}
		details.PreviousRecord = previousRecord
	}

	details.ChainLinkMatch = previousRecord == nil || (previousRecord.DataType == record.DataType && previousRecord.KayrosHash == record.PrevHash)
	if !details.ChainLinkMatch {
		return invalidResult(details, "Previous record chain link mismatch"), nil
	}

	computeResp, computeErr := computeHashForVerify(ComputeHashRequest{
		PrevHash: firstNonEmpty(record.PrevHash, zeroHash32),
		DataType: record.DataType,
		DataItem: record.DataItem,
		TimeUUID: record.UUID,
		HashType: record.HashType,
	}, request.APIKey)
	if computeErr != nil {
		return invalidResult(details, fmt.Sprintf("Failed to recompute Kayros hash: %v", computeErr)), nil
	}
	details.ComputedRecordHash = normalizeHexString(computeResp.Hash)
	details.RecordHashMatch = details.ComputedRecordHash == record.KayrosHash
	if !details.RecordHashMatch {
		return invalidResult(details, fmt.Sprintf("Kayros hash mismatch: computed=%s record=%s", details.ComputedRecordHash, record.KayrosHash)), nil
	}

	details.UUIDTimestampMatch = record.Timestamp != ""
	if !details.UUIDTimestampMatch {
		return invalidResult(details, "Invalid record UUID timestamp"), nil
	}

	return &VerifyResult{
			Valid:   true,
			Details: details,
		}, &verifyCoreState{
			request: request,
			record:  record,
			details: details,
		}
}

func fetchRecordByDataItemForVerify(dataType, dataItem, apiKey string) (*NormalizedKayrosRecord, error) {
	resp, err := getRecordByDataItemForVerify(dataType, dataItem, apiKey)
	if err != nil {
		return nil, err
	}
	if len(resp.Records) == 0 {
		return nil, fmt.Errorf("record not found")
	}
	if len(resp.Records) > 1 {
		return nil, fmt.Errorf("multiple records found for data_item; provide kayros_hash (count=%d)", len(resp.Records))
	}
	return normalizeRecord(&resp.Records[0])
}

func getRecordByDataItemForVerify(dataType, dataItem, apiKey string) (*GetRecordByDataItemResponse, error) {
	params := url.Values{}
	params.Set("data_type", dataType)
	params.Set("data_item", dataItem)
	endpoint := GetKayrosURL(GetRecordByDataItemRoute + "?" + params.Encode())

	resp, err := doJSONGetWithAPIKey(endpoint, apiKey)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result GetRecordByDataItemResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func computeHashForVerify(request ComputeHashRequest, apiKey string) (*ComputeHashResponse, error) {
	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}
	resp, err := doJSONPostWithAPIKey(GetKayrosURL(ComputeHashFromHexRoute), jsonData, apiKey)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}
	var result ComputeHashResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func getMerkleProofForVerify(dataType, hash, apiKey string) (*MerkleProofResponse, error) {
	params := url.Values{}
	params.Set("data_type", dataType)
	params.Set("hash", hash)
	endpoint := GetKayrosURL(GetMerkleProofRoute + "?" + params.Encode())

	resp, err := doJSONGetWithAPIKey(endpoint, apiKey)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}
	var result MerkleProofResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func verifyHashExistenceForVerify(request VerifyHashExistenceRequest, apiKey string) (*VerifyHashExistenceResponse, error) {
	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}
	resp, err := doJSONPostWithAPIKey(GetKayrosURL(VerifyHashExistenceRoute), jsonData, apiKey)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}
	var result VerifyHashExistenceResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func verifyHashBatchForVerify(request VerifyHashBatchRequest, apiKey string) (*VerifyHashBatchResponse, error) {
	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}
	resp, err := doJSONPostWithAPIKey(GetKayrosURL(VerifyHashBatchRoute), jsonData, apiKey)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}
	var result VerifyHashBatchResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func normalizeRecord(raw *GetRecordResponse) (*NormalizedKayrosRecord, error) {
	if raw == nil {
		return nil, fmt.Errorf("invalid remote record structure")
	}

	dataItem := firstNonEmpty(normalizeHexString(raw.DataItemHex), normalizeHexString(raw.DataItem))
	kayrosHash := normalizeHexString(raw.HashItem)
	prevHash := normalizeHexString(raw.PrevHash)
	uuidHex := uuidStringToHex(firstNonEmpty(raw.Ts, ""))
	timestamp := timeuuidHexToTimestamp(uuidHex)

	if raw.DataType == "" || dataItem == "" || kayrosHash == "" || raw.HashType == "" || uuidHex == "" || timestamp == "" {
		return nil, fmt.Errorf("invalid remote record structure")
	}

	copyRecord := *raw
	return &NormalizedKayrosRecord{
		DataType:    raw.DataType,
		DataTypeHex: utf8Hex(raw.DataType),
		DataItem:    dataItem,
		KayrosHash:  kayrosHash,
		PrevHash:    prevHash,
		HashType:    raw.HashType,
		UUID:        uuidHex,
		Timestamp:   timestamp,
		Position:    raw.Position,
		Raw:         &copyRecord,
	}, nil
}

func normalizeMerkleProof(raw *MerkleProofResponse) (*NormalizedMerkleProof, error) {
	if raw == nil || !raw.Success {
		if raw != nil && raw.Error != "" {
			return nil, fmt.Errorf(raw.Error)
		}
		if raw != nil && raw.Message != "" {
			return nil, fmt.Errorf(raw.Message)
		}
		return nil, fmt.Errorf("invalid merkle proof")
	}

	hashItem := normalizeHexString(raw.HashItem)
	root := normalizeHexString(raw.Root)
	if raw.DataType == "" || hashItem == "" || root == "" || len(raw.Proof) == 0 {
		return nil, fmt.Errorf("invalid merkle proof structure")
	}
	proof := make([]string, 0, len(raw.Proof))
	for _, item := range raw.Proof {
		normalized := normalizeHexString(item)
		if normalized == "" {
			return nil, fmt.Errorf("invalid proof hash")
		}
		proof = append(proof, normalized)
	}

	levelCounts := make([]int, len(raw.LevelCounts))
	copy(levelCounts, raw.LevelCounts)
	levelStarts := make([]int64, len(raw.LevelStarts))
	copy(levelStarts, raw.LevelStarts)

	return &NormalizedMerkleProof{
		DataType:    raw.DataType,
		HashItem:    hashItem,
		Proof:       proof,
		Root:        root,
		Position:    raw.Position,
		Levels:      raw.Levels,
		LevelCounts: levelCounts,
		LevelStarts: levelStarts,
		Raw:         raw,
	}, nil
}

func verifyProofPath(proof *NormalizedMerkleProof, levelCounts []int) (string, error) {
	offset := 0
	lastRollup := ""
	prevRollup := ""
	currentPos := proof.Position

	for level, count := range levelCounts {
		if count <= 0 {
			return "", fmt.Errorf("invalid level count")
		}
		if offset+count > len(proof.Proof) {
			return "", fmt.Errorf("proof length mismatch")
		}
		levelHashes := proof.Proof[offset : offset+count]
		if prevRollup != "" {
			index, err := levelIndexForPosition(level, currentPos, count, proof.LevelStarts)
			if err != nil {
				return "", err
			}
			if !strings.EqualFold(levelHashes[index], prevRollup) {
				return "", fmt.Errorf("level hash mismatch level=%d index=%d expected=%s got=%s", level, index, prevRollup, levelHashes[index])
			}
		}
		isLast := level == len(levelCounts)-1
		if isLast && count == 1 {
			lastRollup = levelHashes[0]
		} else {
			rollup, err := sha256HexConcat(levelHashes)
			if err != nil {
				return "", err
			}
			prevRollup = rollup
			if isLast {
				lastRollup = rollup
			}
		}
		offset += count
		currentPos = currentPos / 256
	}

	if lastRollup == "" {
		return "", fmt.Errorf("missing final hash")
	}
	if !strings.EqualFold(lastRollup, proof.Root) {
		return lastRollup, fmt.Errorf("root hash mismatch computed=%s root=%s", lastRollup, proof.Root)
	}
	return lastRollup, nil
}

func verifyProofTargetPosition(proof *NormalizedMerkleProof, targetHash string, levelCounts []int) error {
	if len(levelCounts) == 0 || levelCounts[0] <= 0 {
		return fmt.Errorf("invalid level count")
	}
	index, err := levelIndexForPosition(0, proof.Position, levelCounts[0], proof.LevelStarts)
	if err != nil {
		return err
	}
	if !strings.EqualFold(proof.Proof[index], targetHash) {
		return fmt.Errorf("target hash not found at expected position index=%d expected=%s got=%s", index, targetHash, proof.Proof[index])
	}
	return nil
}

func normalizeLevelCounts(counts []int, levels int, proofLen int) ([]int, error) {
	if proofLen <= 0 {
		return nil, fmt.Errorf("empty proof path")
	}
	if len(counts) > 0 {
		total := 0
		for _, count := range counts {
			if count <= 0 {
				return nil, fmt.Errorf("invalid level count")
			}
			total += count
		}
		if total != proofLen {
			return nil, fmt.Errorf("proof length mismatch")
		}
		return counts, nil
	}
	if levels <= 0 || levels == 1 {
		return []int{proofLen}, nil
	}
	remaining := proofLen - 256*(levels-1)
	if remaining <= 0 {
		return nil, fmt.Errorf("proof length mismatch")
	}
	result := make([]int, 0, levels)
	for i := 0; i < levels-1; i++ {
		result = append(result, 256)
	}
	result = append(result, remaining)
	return result, nil
}

func proofInclusionMeta(proof *NormalizedMerkleProof, levelCounts []int) (bool, int, int64, string) {
	if proof == nil || len(proof.LevelCounts) == 0 || len(levelCounts) == 0 {
		return true, -1, -1, ""
	}

	positions := make([]int64, 0, len(levelCounts))
	currentPos := proof.Position
	positions = append(positions, currentPos)
	for i := 0; i < len(levelCounts)-1; i++ {
		currentPos = currentPos / 256
		positions = append(positions, currentPos)
	}

	maxLevel := len(levelCounts) - 1
	maxLevelPosition := positions[maxLevel]
	maxLevelHash := proof.Root
	if maxLevelHash == "" {
		levelHashes := proofLevelHashes(proof.Proof, levelCounts, maxLevel)
		levelStart := int64(0)
		if maxLevel < len(proof.LevelStarts) {
			levelStart = proof.LevelStarts[maxLevel]
		}
		index := int(maxLevelPosition - levelStart)
		if index >= 0 && index < len(levelHashes) {
			maxLevelHash = levelHashes[index]
		}
	}

	pending := false
	if len(levelCounts) < 2 {
		pending = true
	} else {
		levelStart := int64(0)
		if len(proof.LevelStarts) > 1 {
			levelStart = proof.LevelStarts[1]
		}
		levelIndex := int(positions[1] - levelStart)
		pending = levelIndex < 0 || levelIndex >= levelCounts[1]
	}

	return pending, maxLevel, maxLevelPosition, maxLevelHash
}

func proofLevelHashes(all []string, levelCounts []int, level int) []string {
	if level < 0 || level >= len(levelCounts) {
		return nil
	}
	offset := 0
	for i := 0; i < level; i++ {
		offset += levelCounts[i]
	}
	count := levelCounts[level]
	if count <= 0 || offset+count > len(all) {
		return nil
	}
	return all[offset : offset+count]
}

func proofHashAtLevelPosition(proof *NormalizedMerkleProof, levelCounts []int, level, position int) string {
	levelHashes := proofLevelHashes(proof.Proof, levelCounts, level)
	if len(levelHashes) == 0 {
		return ""
	}
	index, err := levelIndexForPosition(level, int64(position), len(levelHashes), proof.LevelStarts)
	if err != nil {
		return ""
	}
	return levelHashes[index]
}

func levelIndexForPosition(level int, currentPosition int64, count int, levelStarts []int64) (int, error) {
	if count <= 0 {
		return 0, fmt.Errorf("invalid level count")
	}
	start := (currentPosition / int64(count)) * int64(count)
	if level < len(levelStarts) {
		start = levelStarts[level]
	}
	index := currentPosition - start
	if index < 0 || index >= int64(count) {
		return 0, fmt.Errorf("proof index out of range")
	}
	return int(index), nil
}

func sha256HexConcat(hashes []string) (string, error) {
	payload := make([]byte, 0)
	for _, hash := range hashes {
		decoded, err := hex.DecodeString(strings.TrimSpace(hash))
		if err != nil {
			return "", fmt.Errorf("invalid hash hex")
		}
		payload = append(payload, decoded...)
	}
	sum := sha256.Sum256(payload)
	return hex.EncodeToString(sum[:]), nil
}

func dataTypeMatches(record *NormalizedKayrosRecord, expected string) bool {
	if record == nil {
		return false
	}
	return strings.EqualFold(record.DataType, expected) || strings.EqualFold(record.DataTypeHex, utf8Hex(expected))
}

func hashResponseMatches(expectedHash, foundHash string) bool {
	normalized := normalizeHexString(foundHash)
	return normalized == "" || strings.EqualFold(normalized, expectedHash)
}

func normalizeHexString(value string) string {
	decoded, err := decodeFlexibleBytes(value)
	if err != nil || len(decoded) == 0 {
		return ""
	}
	return hex.EncodeToString(decoded)
}

func decodeFlexibleBytes(value string) ([]byte, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, fmt.Errorf("empty value")
	}
	hexCandidate := strings.TrimPrefix(strings.TrimPrefix(trimmed, "0x"), "0X")
	if len(hexCandidate)%2 == 0 && hexCandidate != "" {
		if decoded, err := hex.DecodeString(hexCandidate); err == nil {
			return decoded, nil
		}
	}

	normalized := strings.ReplaceAll(strings.ReplaceAll(trimmed, "-", "+"), "_", "/")
	if mod := len(normalized) % 4; mod != 0 {
		normalized += strings.Repeat("=", 4-mod)
	}
	decoded, err := base64.StdEncoding.DecodeString(normalized)
	if err != nil {
		return nil, err
	}
	return decoded, nil
}

func uuidStringToHex(value string) string {
	normalized := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(value), "-", ""))
	if len(normalized) != 32 {
		return ""
	}
	if _, err := hex.DecodeString(normalized); err != nil {
		return ""
	}
	return normalized
}

func timeuuidHexToTimestamp(timeuuidHex string) string {
	uuidBytes, err := hex.DecodeString(timeuuidHex)
	if err != nil || len(uuidBytes) != 16 {
		return ""
	}

	timeLow := uint64(uuidBytes[0])<<24 | uint64(uuidBytes[1])<<16 | uint64(uuidBytes[2])<<8 | uint64(uuidBytes[3])
	timeMid := uint64(uuidBytes[4])<<8 | uint64(uuidBytes[5])
	timeHi := (uint64(uuidBytes[6])<<8 | uint64(uuidBytes[7])) & 0x0FFF
	timestamp := timeLow | (timeMid << 32) | (timeHi << 48)

	const gregorianEpoch = 122192928000000000
	unixNanos := int64((timestamp - gregorianEpoch) * 100)
	return time.Unix(0, unixNanos).UTC().Format(time.RFC3339Nano)
}

func utf8Hex(value string) string {
	return hex.EncodeToString([]byte(value))
}

func isZeroHash(value string) bool {
	if value == "" {
		return false
	}
	for _, c := range value {
		if c != '0' {
			return false
		}
	}
	return true
}

func invalidResult(details *VerifyResultDetails, errorMessage string) *VerifyResult {
	return &VerifyResult{
		Valid:   false,
		Error:   errorMessage,
		Details: details,
	}
}
