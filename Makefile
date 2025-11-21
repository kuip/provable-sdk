.PHONY: help test test-js test-py test-go coverage coverage-js coverage-py coverage-go install install-js install-py install-go clean

# Default target
help:
	@echo "Provable SDK - Test Commands"
	@echo ""
	@echo "Available targets:"
	@echo "  make test          - Run all tests across all SDKs"
	@echo "  make test-js       - Run TypeScript SDK tests"
	@echo "  make test-py       - Run Python SDK tests"
	@echo "  make test-go       - Run Go SDK tests"
	@echo ""
	@echo "  make coverage      - Run all tests with coverage"
	@echo "  make coverage-js   - Run TypeScript tests with coverage"
	@echo "  make coverage-py   - Run Python tests with coverage"
	@echo "  make coverage-go   - Run Go tests with coverage"
	@echo ""
	@echo "  make install       - Install dependencies for all SDKs"
	@echo "  make install-js    - Install TypeScript dependencies"
	@echo "  make install-py    - Install Python dependencies"
	@echo "  make install-go    - Install Go dependencies"
	@echo ""
	@echo "  make clean         - Clean build artifacts"

# Run all tests
test: test-js test-py test-go
	@echo ""
	@echo "✓ All tests completed successfully!"

# TypeScript tests
test-js:
	@echo "Running TypeScript SDK tests..."
	@cd provable-sdk-js && npm test

# Python tests
test-py:
	@echo "Running Python SDK tests..."
	@cd provable-sdk-py && pytest -v

# Go tests
test-go:
	@echo "Running Go SDK tests..."
	@cd provable-sdk-go && go test -v ./...

# Coverage for all SDKs
coverage: coverage-js coverage-py coverage-go
	@echo ""
	@echo "✓ All coverage reports generated!"

# TypeScript coverage
coverage-js:
	@echo "Running TypeScript SDK tests with coverage..."
	@cd provable-sdk-js && npm run test:coverage

# Python coverage
coverage-py:
	@echo "Running Python SDK tests with coverage..."
	@cd provable-sdk-py && pytest --cov=provable_sdk --cov-report=html --cov-report=term

# Go coverage
coverage-go:
	@echo "Running Go SDK tests with coverage..."
	@cd provable-sdk-go && go test -cover ./...
	@cd provable-sdk-go && go test -coverprofile=coverage.out ./...
	@cd provable-sdk-go && go tool cover -html=coverage.out -o coverage.html
	@echo "Go coverage report: provable-sdk-go/coverage.html"

# Install all dependencies
install: install-js install-py install-go
	@echo ""
	@echo "✓ All dependencies installed!"

# Install TypeScript dependencies
install-js:
	@echo "Installing TypeScript SDK dependencies..."
	@cd provable-sdk-js && npm install

# Install Python dependencies
install-py:
	@echo "Installing Python SDK dependencies..."
	@cd provable-sdk-py && pip install -e ".[dev]"

# Install Go dependencies
install-go:
	@echo "Installing Go SDK dependencies..."
	@cd provable-sdk-go && go mod download
	@cd provable-sdk-go && go mod tidy

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@cd provable-sdk-js && rm -rf node_modules dist coverage .vitest 2>/dev/null || true
	@cd provable-sdk-py && rm -rf .pytest_cache htmlcov .coverage __pycache__ build dist *.egg-info 2>/dev/null || true
	@cd provable-sdk-py && find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@cd provable-sdk-go && rm -f coverage.out coverage.html 2>/dev/null || true
	@echo "✓ Clean complete!"

# Quick test (run tests without verbose output)
test-quick:
	@echo "Running quick tests..."
	@cd provable-sdk-js && npm test > /dev/null 2>&1 && echo "✓ TypeScript tests passed" || echo "✗ TypeScript tests failed"
	@cd provable-sdk-py && pytest -q > /dev/null 2>&1 && echo "✓ Python tests passed" || echo "✗ Python tests failed"
	@cd provable-sdk-go && go test ./... > /dev/null 2>&1 && echo "✓ Go tests passed" || echo "✗ Go tests failed"

# Watch mode for development
watch-js:
	@echo "Running TypeScript tests in watch mode..."
	@cd provable-sdk-js && npm run test:watch

# Individual SDK test targets with specific test selection
test-js-hash:
	@cd provable-sdk-js && npm test -- hash.test.ts

test-py-hash:
	@cd provable-sdk-py && pytest tests/test_hash.py -v

test-go-hash:
	@cd provable-sdk-go && go test -v -run TestHash

# Lint targets (if linters are added in the future)
lint:
	@echo "Linting not yet configured"

# Format targets (if formatters are added in the future)
format:
	@echo "Formatting not yet configured"

# CI target - runs tests suitable for continuous integration
ci: test coverage
	@echo "✓ CI tests complete!"
