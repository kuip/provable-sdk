package provable

type RequestOptions struct {
	DataType     string
	OmitDataType bool
	APIKey       string
}

type VerifyOptions struct {
	APIKey    string
	DataTypes []string
}

func resolveRequestOptions(opts *RequestOptions) (dataType string, includeDataType bool, apiKey string) {
	if opts == nil {
		return DataType, true, ""
	}
	if opts.OmitDataType {
		return "", false, opts.APIKey
	}
	if opts.DataType != "" {
		return opts.DataType, true, opts.APIKey
	}
	return DataType, true, opts.APIKey
}

func mergeLookupCandidates(explicit []string, envelope []string) []string {
	merged := make([]string, 0, len(explicit)+len(envelope))
	seen := make(map[string]struct{}, len(explicit)+len(envelope))

	push := func(candidate string) {
		if _, ok := seen[candidate]; ok {
			return
		}
		seen[candidate] = struct{}{}
		merged = append(merged, candidate)
	}

	for _, candidate := range explicit {
		push(candidate)
	}
	for _, candidate := range envelope {
		push(candidate)
	}
	if len(merged) == 0 {
		push("")
	}

	return merged
}
