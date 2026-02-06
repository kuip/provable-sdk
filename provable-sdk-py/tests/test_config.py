"""
Tests for config module
"""

from provable_sdk.config import (
    get_kayros_url,
    DATA_TYPE,
    KAYROS_HOST,
)


class TestGetKayrosUrl:
    def test_build_correct_url_from_route(self):
        assert get_kayros_url("/api/test") == f"{KAYROS_HOST}/api/test"

    def test_concatenate_host_and_route(self):
        assert get_kayros_url("/api/test") == f"{KAYROS_HOST}/api/test"
        assert get_kayros_url("api/test") == f"{KAYROS_HOST}api/test"


class TestDataTypeConstant:
    def test_is_padded_label(self):
        assert DATA_TYPE.replace("\x00", "") == "provable_sdk"
        assert len(DATA_TYPE.encode("utf-8")) == 32
