package provable

// ProveData proves data by computing its hash and calling Kayros API
func ProveData(data []byte) (*ProveSingleHashResponse, error) {
	dataHash := Keccak256(data)
	return ProveSingleHash(dataHash)
}

// ProveDataStr proves string data by computing its hash and calling Kayros API
func ProveDataStr(s string) (*ProveSingleHashResponse, error) {
	dataHash := Keccak256Str(s)
	return ProveSingleHash(dataHash)
}
