## Why

The project currently relies on Jest and a Next.js-specific Jest adapter for its test runner, setup, scripts, and development dependencies. Switching to Vitest will modernize the test toolchain and reduce Jest-specific configuration while preserving the existing test suite's behavior and coverage expectations.

## What Changes

- Replace Jest as the configured test runner with Vitest and the appropriate Next.js/React testing integration.
- Translate the existing Jest configuration and setup behavior, including jsdom, path aliases, coverage collection/thresholds, global mocks, and the Next.js router/auth/fetch/browser API mocks.
- Update package scripts and development dependencies to use Vitest commands and types.
- Update existing tests and test-only imports/globals as needed for Vitest compatibility.
- Remove obsolete Jest configuration, setup, dependencies, and type packages once the Vitest suite is passing.
- Preserve the existing test command variants, test discovery, coverage thresholds, and test semantics as closely as the new runner permits.

## Capabilities

### New Capabilities

None. This is a test-tooling migration and does not introduce user-facing or product behavior.

### Modified Capabilities

None. No product or externally observable requirements are intended to change.

## Impact

- Affected configuration: `jest.config.ts`, `jest.setup.ts`, `package.json`, and any new Vitest configuration/setup files.
- Affected tests: the existing tests under `__tests__/` and `utils/**/__tests__/` may need API/global import updates.
- Affected dependencies: Jest packages and Jest types will be replaced by Vitest and any required testing-library/Vite integration.
- Affected developer and CI workflows: `test`, watch, and coverage commands must continue to work with the new runner.
- No application runtime APIs, database behavior, or user-facing functionality should change.
