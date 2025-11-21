package provable

// KayrosTimestamp represents a timestamp from the Kayros service
type KayrosTimestamp struct {
	Service  string      `json:"service"`
	Response interface{} `json:"response"`
}

// KayrosMetadata represents metadata attached to Kayros envelopes
type KayrosMetadata struct {
	Hash          string           `json:"hash,omitempty"`
	HashAlgorithm string           `json:"hashAlgorithm,omitempty"`
	Timestamp     *KayrosTimestamp `json:"timestamp,omitempty"`
}

// KayrosEnvelope wraps data with Kayros metadata
type KayrosEnvelope struct {
	Data   interface{}    `json:"data"`
	Kayros KayrosMetadata `json:"kayros"`
}

// ProveSingleHashResponseData contains the computed hash from Kayros
type ProveSingleHashResponseData struct {
	ComputedHashHex string                 `json:"computed_hash_hex"`
	Extra           map[string]interface{} `json:"-"`
}

// ProveSingleHashResponse is the response from the prove single hash API
type ProveSingleHashResponse struct {
	Data ProveSingleHashResponseData `json:"data"`
}

// GetRecordResponseData contains the record data from Kayros
type GetRecordResponseData struct {
	DataItemHex string                 `json:"data_item_hex"`
	Timestamp   string                 `json:"timestamp,omitempty"`
	Extra       map[string]interface{} `json:"-"`
}

// GetRecordResponse is the response from the get record by hash API
type GetRecordResponse struct {
	Data GetRecordResponseData `json:"data"`
}

// VerifyResultDetails contains detailed information about the verification
type VerifyResultDetails struct {
	HashMatch    bool   `json:"hashMatch,omitempty"`
	RemoteMatch  bool   `json:"remoteMatch,omitempty"`
	ComputedHash string `json:"computedHash,omitempty"`
	EnvelopeHash string `json:"envelopeHash,omitempty"`
	RemoteHash   string `json:"remoteHash,omitempty"`
}

// VerifyResult represents the result of a verification operation
type VerifyResult struct {
	Valid   bool                 `json:"valid"`
	Error   string               `json:"error,omitempty"`
	Details *VerifyResultDetails `json:"details,omitempty"`
}
