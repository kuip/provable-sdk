.PHONY: help test test-js test-py test-go coverage coverage-js coverage-py coverage-go install install-js install-py install-go clean \
	build build-js build-py build-go publish publish-js publish-py publish-go publish-all \
	publish-dry-run publish-dry-run-js publish-dry-run-py tag-go version-js version-py version-go

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
	@echo "  make build         - Build all SDK packages"
	@echo "  make build-js      - Build TypeScript package"
	@echo "  make build-py      - Build Python package"
	@echo "  make build-go      - Build/verify Go package"
	@echo ""
	@echo "  make publish       - Publish all SDK packages (use with caution!)"
	@echo "  make publish-js    - Publish TypeScript package to npm"
	@echo "  make publish-py    - Publish Python package to PyPI"
	@echo "  make publish-go    - Tag and push Go module (requires VERSION=vX.Y.Z)"
	@echo ""
	@echo "  make publish-dry-run    - Test publish for JS and Python without uploading"
	@echo "  make publish-dry-run-js - Test npm publish without uploading"
	@echo "  make publish-dry-run-py - Test PyPI publish without uploading"
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

# Build targets
build: build-js build-py build-go
	@echo ""
	@echo "✓ All packages built successfully!"

build-js:
	@echo "Building TypeScript SDK..."
	@cd provable-sdk-js && npm run build
	@echo "✓ TypeScript build complete!"

build-py:
	@echo "Building Python SDK..."
	@cd provable-sdk-py && python -m build
	@echo "✓ Python build complete!"

build-go:
	@echo "Verifying Go SDK builds..."
	@cd provable-sdk-go && go build ./...
	@echo "✓ Go build verification complete!"

# Publish targets
publish-js: test-js
	@echo "Publishing TypeScript SDK to npm..."
	@VERSION=$$(cd provable-sdk-js && node -p "require('./package.json').version"); \
	echo "Version: $$VERSION"; \
	echo "⚠️  This will:"; \
	echo "  1. Publish to npm"; \
	echo "  2. Create git tag js-v$$VERSION"; \
	echo "  3. Push tag and commits to main"; \
	echo ""; \
	echo "Press Ctrl+C to cancel, or Enter to continue..."; \
	read -r; \
	cd provable-sdk-js && npm publish && \
	cd .. && git tag -a "js-v$$VERSION" -m "Release TypeScript SDK v$$VERSION" && \
	git push origin main && \
	git push origin "js-v$$VERSION"
	@echo "✓ TypeScript SDK published and tagged!"

publish-py: test-py build-py
	@echo "Publishing Python SDK to PyPI..."
	@VERSION=$$(cd provable-sdk-py && grep '^version = ' pyproject.toml | cut -d'"' -f2); \
	echo "Version: $$VERSION"; \
	echo "⚠️  This will:"; \
	echo "  1. Publish to PyPI"; \
	echo "  2. Create git tag py-v$$VERSION"; \
	echo "  3. Push tag and commits to main"; \
	echo ""; \
	echo "Press Ctrl+C to cancel, or Enter to continue..."; \
	read -r; \
	cd provable-sdk-py && python -m twine upload dist/* && \
	cd .. && git tag -a "py-v$$VERSION" -m "Release Python SDK v$$VERSION" && \
	git push origin main && \
	git push origin "py-v$$VERSION"
	@echo "✓ Python SDK published and tagged!"

publish-go: test-go
	@echo "Publishing Go SDK..."
	@if [ -z "$(VERSION)" ]; then \
		echo "❌ Error: VERSION not specified. Usage: make publish-go VERSION=v0.1.0"; \
		exit 1; \
	fi
	@echo "Version: $(VERSION)"
	@echo "⚠️  This will:"
	@echo "  1. Create git tag go-$(VERSION)"
	@echo "  2. Push tag and commits to main"
	@echo ""
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read -r
	@git tag -a "go-$(VERSION)" -m "Release Go SDK $(VERSION)"
	@git push origin main
	@git push origin "go-$(VERSION)"
	@echo "✓ Go SDK published with tag go-$(VERSION)!"
	@echo "Users can install with: go get github.com/provable/provable-sdk-go@go-$(VERSION)"

# Publish all SDKs (alias for publish-all)
publish: publish-all

# Publish all SDKs (dangerous - use with caution!)
publish-all:
	@echo "⚠️  WARNING: This will publish ALL SDK packages!"
	@echo "Make sure you have:"
	@echo "  1. Bumped versions in all package files"
	@echo "  2. Updated changelogs"
	@echo "  3. Run all tests (make test)"
	@echo "  4. Committed all changes"
	@echo ""
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read -r
	@make publish-js
	@make publish-py
	@echo ""
	@echo "✓ JavaScript and Python SDKs published!"
	@echo ""
	@echo "For Go SDK, run: make publish-go VERSION=vX.Y.Z"

# Dry run publish (test without actually publishing)
publish-dry-run: publish-dry-run-js publish-dry-run-py
	@echo ""
	@echo "✓ Dry run completed for all packages!"

publish-dry-run-js:
	@echo "Dry run: Publishing TypeScript SDK..."
	@cd provable-sdk-js && npm publish --dry-run
	@echo "✓ TypeScript dry run complete!"

publish-dry-run-py: build-py
	@echo "Dry run: Publishing Python SDK..."
	@cd provable-sdk-py && python -m twine check dist/*
	@echo "✓ Python dry run complete!"

# Helper targets for version management
version-js:
	@cd provable-sdk-js && npm version

version-py:
	@cd provable-sdk-py && grep "version = " pyproject.toml

version-go:
	@cd provable-sdk-go && git tag --list | grep "^v" | sort -V | tail -1
