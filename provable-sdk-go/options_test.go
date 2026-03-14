package provable

import "testing"

func TestResolveRequestOptions(t *testing.T) {
	t.Run("defaults to configured data type", func(t *testing.T) {
		dataType, includeDataType, apiKey := resolveRequestOptions(nil)
		if dataType != DataType || !includeDataType || apiKey != "" {
			t.Fatalf("resolveRequestOptions(nil) = (%q, %v, %q)", dataType, includeDataType, apiKey)
		}
	})

	t.Run("supports explicit overrides", func(t *testing.T) {
		dataType, includeDataType, apiKey := resolveRequestOptions(&RequestOptions{
			DataType: "provable_custom",
			APIKey:   "private-key-123",
		})
		if dataType != "provable_custom" || !includeDataType || apiKey != "private-key-123" {
			t.Fatalf("resolveRequestOptions override = (%q, %v, %q)", dataType, includeDataType, apiKey)
		}
	})

	t.Run("can omit data type for lookups", func(t *testing.T) {
		dataType, includeDataType, apiKey := resolveRequestOptions(&RequestOptions{
			OmitDataType: true,
			APIKey:       "private-key-456",
		})
		if dataType != "" || includeDataType || apiKey != "private-key-456" {
			t.Fatalf("resolveRequestOptions omit = (%q, %v, %q)", dataType, includeDataType, apiKey)
		}
	})
}

func TestMergeLookupCandidates(t *testing.T) {
	candidates := mergeLookupCandidates([]string{"", "proof_type"}, []string{"proof_type", "decoded_type"})
	if len(candidates) != 3 {
		t.Fatalf("mergeLookupCandidates length = %d, want 3", len(candidates))
	}
	if candidates[0] != "" || candidates[1] != "proof_type" || candidates[2] != "decoded_type" {
		t.Fatalf("mergeLookupCandidates = %#v", candidates)
	}
}
