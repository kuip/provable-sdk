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
    def test_accept_valid_label(self):
        valid_data_type = "provable_sdk"
        validate_data_type(valid_data_type)  # Should not raise

    def test_reject_strings_too_long(self):
        too_long = "x" * 33
        with pytest.raises(ValueError, match="data_type must be at most 32 bytes"):
            validate_data_type(too_long)


class TestDataTypeConstant:
    def test_is_padded_label(self):
        assert DATA_TYPE.replace("\x00", "") == "provable_sdk"
        assert len(DATA_TYPE.encode("utf-8")) == 32

    def test_passes_own_validation(self):
        validate_data_type(DATA_TYPE)  # Should not raise
