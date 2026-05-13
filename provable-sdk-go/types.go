package provable

// ProveSingleHashResponse is the response from the prove single hash API
type ProveSingleHashResponse struct {
	Success  bool   `json:"success"`
	Hash     string `json:"hash,omitempty"`
	TimeUUID string `json:"timeuuid,omitempty"`
	Encoding string `json:"encoding,omitempty"`
	Error    string `json:"error,omitempty"`
}

// GetRecordResponse is the response from the get record by hash API
type GetRecordResponse struct {
	DataItemHex string `json:"data_item_hex,omitempty"`
	DataItem    string `json:"data_item"`
	DataType    string `json:"data_type"`
	HashItem    string `json:"hash_item"`
	HashType    string `json:"hash_type"`
	Position    int64  `json:"position"`
	PrevHash    string `json:"prev_hash,omitempty"`
	Ts          string `json:"ts"`
}

type VerifyRequest struct {
	DataType   string `json:"data_type"`
	DataItem   string `json:"data_item,omitempty"`
	KayrosHash string `json:"kayros_hash,omitempty"`
	APIKey     string `json:"-"`
}

type VerifyLevelCheck struct {
	Level    int    `json:"level"`
	Position int    `json:"position"`
	Hash     string `json:"hash,omitempty"`
}

type VerifyWithInclusionRequest struct {
	VerifyRequest
	TrustedRootHash      string             `json:"trusted_root_hash,omitempty"`
	TrustedLevel         *int               `json:"trusted_level,omitempty"`
	TrustedPosition      *int               `json:"trusted_position,omitempty"`
	LevelsHashType       string             `json:"levels_hash_type,omitempty"`
	VerifyBatchExistence bool               `json:"verify_batch_existence,omitempty"`
	LevelChecks          []VerifyLevelCheck `json:"level_checks,omitempty"`
}

type VerifyMerkleProofWithDetailsRequest struct {
	Proof          any    `json:"proof"`
	LevelsHashType string `json:"levels_hash_type,omitempty"`
}

type VerifyMerkleProofWithDetailsResult struct {
	Valid            bool                   `json:"valid"`
	Pending          bool                   `json:"pending"`
	Status           string                 `json:"status"`
	Message          string                 `json:"message"`
	Error            string                 `json:"error,omitempty"`
	Details          []string               `json:"details"`
	PositionPath     []int64                `json:"positionPath"`
	LevelsHashType   string                 `json:"levelsHashType"`
	ComputedRoot     string                 `json:"computedRoot,omitempty"`
	MaxLevel         int                    `json:"maxLevel"`
	MaxLevelPosition int64                  `json:"maxLevelPosition"`
	MaxLevelHash     string                 `json:"maxLevelHash"`
	Proof            *NormalizedMerkleProof `json:"proof,omitempty"`
}

type NormalizedKayrosRecord struct {
	DataType    string             `json:"data_type"`
	DataTypeHex string             `json:"data_type_hex"`
	DataItem    string             `json:"data_item"`
	KayrosHash  string             `json:"kayros_hash"`
	PrevHash    string             `json:"prev_hash,omitempty"`
	HashType    string             `json:"hash_type"`
	UUID        string             `json:"uuid"`
	Timestamp   string             `json:"timestamp"`
	Position    int64              `json:"position"`
	Raw         *GetRecordResponse `json:"raw,omitempty"`
}

type NormalizedMerkleProof struct {
	DataType    string      `json:"data_type"`
	HashItem    string      `json:"hash_item"`
	Proof       []string    `json:"proof"`
	Root        string      `json:"root"`
	Position    int64       `json:"position"`
	Levels      int         `json:"levels"`
	LevelCounts []int       `json:"level_counts"`
	LevelStarts []int64     `json:"level_starts"`
	Raw         interface{} `json:"raw,omitempty"`
}

type MerkleProofLevel struct {
	Level  int      `json:"level"`
	Start  int64    `json:"start"`
	Count  int      `json:"count"`
	Hashes []string `json:"hashes"`
}

type MerkleProofCompatibilityMismatch struct {
	Kind             string `json:"kind"`
	Level            int    `json:"level,omitempty"`
	Position         int64  `json:"position,omitempty"`
	PreviousIndex    int    `json:"previousIndex,omitempty"`
	NextIndex        int    `json:"nextIndex,omitempty"`
	PreviousPosition int64  `json:"previousPosition,omitempty"`
	NextPosition     int64  `json:"nextPosition,omitempty"`
	PreviousHash     string `json:"previousHash,omitempty"`
	NextHash         string `json:"nextHash,omitempty"`
	Message          string `json:"message"`
}

type MerkleProofCompatibilityResult struct {
	Compatible     bool                               `json:"compatible"`
	CheckedEntries int                                `json:"checkedEntries"`
	Previous       *NormalizedMerkleProof             `json:"previous"`
	Next           *NormalizedMerkleProof             `json:"next"`
	PreviousLevels []MerkleProofLevel                 `json:"previousLevels"`
	NextLevels     []MerkleProofLevel                 `json:"nextLevels"`
	Mismatches     []MerkleProofCompatibilityMismatch `json:"mismatches"`
}

type LevelCheckResult struct {
	Level     int    `json:"level"`
	Position  int    `json:"position"`
	Hash      string `json:"hash"`
	Valid     bool   `json:"valid"`
	Exists    bool   `json:"exists,omitempty"`
	FoundHash string `json:"found_hash,omitempty"`
	Message   string `json:"message,omitempty"`
}

type BatchExistenceCheckResult struct {
	Level      int      `json:"level"`
	Start      int64    `json:"start"`
	Hashes     []string `json:"hashes"`
	Valid      bool     `json:"valid"`
	Results    []int    `json:"results,omitempty"`
	Matches    int      `json:"matches,omitempty"`
	Mismatches int      `json:"mismatches,omitempty"`
}

// VerifyResultDetails contains detailed information about the verification.
type VerifyResultDetails struct {
	LookupMode          string                      `json:"lookupMode"`
	RecordFound         bool                        `json:"recordFound"`
	Ambiguous           bool                        `json:"ambiguous,omitempty"`
	AmbiguousCount      int                         `json:"ambiguousCount,omitempty"`
	DataTypeMatch       bool                        `json:"dataTypeMatch,omitempty"`
	DataItemMatch       bool                        `json:"dataItemMatch,omitempty"`
	KayrosHashMatch     bool                        `json:"kayrosHashMatch,omitempty"`
	RecordHashMatch     bool                        `json:"recordHashMatch,omitempty"`
	ChainLinkMatch      bool                        `json:"chainLinkMatch,omitempty"`
	UUIDTimestampMatch  bool                        `json:"uuidTimestampMatch,omitempty"`
	ProofFetched        bool                        `json:"proofFetched,omitempty"`
	ProofDataTypeMatch  bool                        `json:"proofDataTypeMatch,omitempty"`
	ProofHashItemMatch  bool                        `json:"proofHashItemMatch,omitempty"`
	ProofPathMatch      bool                        `json:"proofPathMatch,omitempty"`
	TargetPositionMatch bool                        `json:"targetPositionMatch,omitempty"`
	TrustedRootMatch    bool                        `json:"trustedRootMatch,omitempty"`
	TrustedLevelMatch   bool                        `json:"trustedLevelMatch,omitempty"`
	BatchExistenceMatch bool                        `json:"batchExistenceMatch,omitempty"`
	LevelsHashType      string                      `json:"levelsHashType,omitempty"`
	Pending             bool                        `json:"pending,omitempty"`
	MaxLevel            int                         `json:"maxLevel,omitempty"`
	MaxLevelPosition    int64                       `json:"maxLevelPosition,omitempty"`
	MaxLevelHash        string                      `json:"maxLevelHash,omitempty"`
	ComputedRecordHash  string                      `json:"computedRecordHash,omitempty"`
	LocalRootHash       string                      `json:"localRootHash,omitempty"`
	Record              *NormalizedKayrosRecord     `json:"record,omitempty"`
	PreviousRecord      *NormalizedKayrosRecord     `json:"previousRecord,omitempty"`
	Proof               *NormalizedMerkleProof      `json:"proof,omitempty"`
	LevelChecks         []LevelCheckResult          `json:"levelChecks,omitempty"`
	BatchChecks         []BatchExistenceCheckResult `json:"batchChecks,omitempty"`
}

// VerifyResult represents the result of a verification operation.
type VerifyResult struct {
	Valid   bool                 `json:"valid"`
	Error   string               `json:"error,omitempty"`
	Details *VerifyResultDetails `json:"details,omitempty"`
}
