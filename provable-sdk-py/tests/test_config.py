"""
Tests for config module
"""

import pytest
from provable_sdk.config import (
    get_kayros_url,
    validate_data_type,
    DATA_TYPE,
    KAYROS_HOST,
)


class TestGetKayrosUrl:
    def test_build_correct_url_from_route(self):
        assert get_kayros_url("/api/test") == f"{KAYROS_HOST}/api/test"

    def test_concatenate_host_and_route(self):
        assert get_kayros_url("/api/test") == f"{KAYROS_HOST}/api/test"
        assert get_kayros_url("api/test") == f"{KAYROS_HOST}api/test"


class TestValidateDataType:
    def test_accept_valid_64_character_hex_string(self):
        valid_data_type = "70726f7661626c655f73646b0000000000000000000000000000000000000000"
        validate_data_type(valid_data_type)  # Should not raise

    def test_accept_uppercase_hex_characters(self):
        valid_data_type = "70726F7661626C655F73646B0000000000000000000000000000000000000000"
        validate_data_type(valid_data_type)  # Should not raise

    def test_reject_strings_too_short(self):
        with pytest.raises(ValueError, match="data_type must be exactly 64 hex characters"):
            validate_data_type("abc123")

    def test_reject_strings_too_long(self):
        too_long = "70726f7661626c655f73646b" + ("0" * 100)
        with pytest.raises(ValueError, match="data_type must be exactly 64 hex characters"):
            validate_data_type(too_long)

    def test_reject_non_hex_characters(self):
        invalid_hex = "gggg" + ("0" * 60)
        with pytest.raises(ValueError, match="data_type must contain only valid hex characters"):
            validate_data_type(invalid_hex)

    def test_reject_strings_with_special_characters(self):
        with_special = "70726f76@" + ("0" * 55)
        with pytest.raises(ValueError, match="data_type must contain only valid hex characters"):
            validate_data_type(with_special)


class TestDataTypeConstant:
    def test_exactly_64_characters(self):
        assert len(DATA_TYPE) == 64

    def test_contains_only_hex_characters(self):
        import re
        assert re.match(r"^[0-9a-fA-F]{64}$", DATA_TYPE)

    def test_starts_with_provable_sdk_in_hex(self):
        # "provable_sdk" = 0x70726f7661626c655f73646b
        assert DATA_TYPE.startswith("70726f7661626c655f73646b")

    def test_passes_own_validation(self):
        validate_data_type(DATA_TYPE)  # Should not raise
