# Python SDK Tests

## Running Tests

### Install Dependencies
```bash
pip install -e ".[dev]"
```

Or install pytest separately:
```bash
pip install pytest pytest-cov
```

### Run All Tests
```bash
pytest
```

### Run Tests with Verbose Output
```bash
pytest -v
```

### Run Tests with Coverage
```bash
pytest --cov=provable_sdk --cov-report=html
```

### Run Specific Test File
```bash
pytest tests/test_hash.py
```

### Run Specific Test
```bash
pytest tests/test_hash.py::TestKeccak256::test_hash_empty_data
```

## Test Structure

- `tests/test_config.py` - Tests for configuration and validation
- `tests/test_hash.py` - Tests for hash functions (keccak256, sha256)
- `tests/test_api.py` - Tests for API calls (mocked)
- `tests/test_prove.py` - Tests for prove functions

## Test Coverage

The tests cover:
- ✓ Hash functions (keccak256, sha256, and string variants)
- ✓ Data type validation (length and hex character validation)
- ✓ API calls with default and custom data types
- ✓ Error handling for invalid inputs
- ✓ Consistency of hash outputs

## Mocking

API tests use `unittest.mock` to mock HTTP calls via the `requests` library, so no actual HTTP requests are made during testing.

## Configuration

Test configuration is in `pytest.ini` with sensible defaults for test discovery and output formatting.
