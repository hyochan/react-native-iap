# Codecov Integration

This document explains how code coverage is integrated with Codecov for the react-native-iap project.

## Overview

The project uses Codecov to track test coverage across the main library and example app. Coverage reports are automatically generated and uploaded on every push and pull request.

## Setup

### 1. GitHub Actions Workflow

The `.github/workflows/test-coverage.yml` file runs tests with coverage on:

- Push to main/develop branches
- Pull requests to main/develop branches

The workflow:

- Tests on Node.js 18.x and 20.x
- Runs linting before tests
- Generates coverage reports in multiple formats (lcov, json, text)
- Uploads reports to Codecov

### 2. Jest Configuration

Coverage is configured in `jest.config.js`:

- Collects coverage from all `src/**/*.{ts,tsx}` files
- Excludes test files and native module stubs
- Sets minimum coverage thresholds (50% for all metrics)
- Outputs reports in `coverage/` directory

### 3. Codecov Configuration

The `codecov.yml` file configures:

- Coverage targets (60% for main code, 40% for example)
- Two coverage flags: `unittests` and `example`
- Ignore patterns for test files and generated code
- Comment behavior on pull requests

## Running Coverage Locally

### Main Library

```bash
# Run tests with coverage
bun test --coverage

# Generate HTML coverage report
bun test --coverage --coverageReporters=html
# Open coverage/index.html in browser
```

### Example App

```bash
cd example
bun test --coverage
```

### Both Together

```bash
# From project root
./scripts/test-coverage.sh
```

## Coverage Reports

Coverage reports are generated in:

- `./coverage/` - Main library coverage
- `./example/coverage/` - Example app coverage

Reports include:

- **lcov.info** - Machine-readable format for Codecov
- **coverage-summary.json** - JSON summary
- **HTML reports** - Interactive browser reports in `coverage/lcov-report/`

## Codecov Dashboard

View coverage reports at: https://codecov.io/gh/hyochan/react-native-iap

The dashboard shows:

- Overall coverage percentage
- Coverage trends over time
- File-by-file coverage breakdown
- Pull request coverage changes

## Coverage Flags

The project uses two coverage flags:

### `unittests`

- Main library tests
- Target: 60% coverage
- Path: `src/**`

### `example`

- Example app tests
- Target: 40% coverage
- Path: `example/**`

## Adding Tests

When adding new features:

1. Write tests alongside your code
2. Ensure tests cover edge cases
3. Run coverage locally before pushing
4. Check that coverage doesn't decrease

## Troubleshooting

### Coverage Not Updating

- Ensure `CODECOV_TOKEN` is set in GitHub secrets
- Check GitHub Actions logs for upload errors
- Verify coverage files are generated locally

### Low Coverage

- Run coverage locally to identify untested code
- Focus on testing business logic and error paths
- Use coverage HTML reports to visualize gaps

### False Positives

- Add files to `ignore` in `codecov.yml` if needed
- Use `/* istanbul ignore next */` sparingly for untestable code
