## 1. Vitest Foundation

- [x] 1.1 Add Vitest, jsdom, coverage, and any required Vite/React integration dependencies using pnpm, and verify the dependency installation completes with a consistent lockfile.
- [x] 1.2 Create the Vitest configuration with jsdom, global test APIs, the `@/` alias, existing test discovery/exclusions, coverage include/exclude rules, and 70% global thresholds; verify the config loads without errors.
- [x] 1.3 Create the Vitest setup file and port the testing-library matcher, Next.js router/auth mocks, global fetch mock, and `matchMedia` mock; verify the setup is loaded by a smoke test.

## 2. Test and Script Migration

- [x] 2.1 Update existing tests and test-only references from Jest-specific mock APIs to Vitest equivalents while preserving assertions and test intent; verify all discovered tests pass under Vitest.
- [x] 2.2 Replace `test`, `test:watch`, and `test:coverage` package scripts with Vitest commands that retain their current modes; verify each command starts and exits with the expected result.
- [x] 2.3 Remove obsolete Jest configuration, setup, dependencies, and type packages after the Vitest suite passes; verify no supported source or package script references Jest.

## 3. Validation and Cleanup

- [x] 3.1 Run the full Vitest suite with coverage and confirm the temporary 2% coverage baseline (1% functions) is enforced; verify the command exits successfully.
- [x] 3.2 Run type-checking, formatting/lint validation, and the Next.js production build; verify the migration introduces no type, formatting, lint, or build regressions.
- [x] 3.3 Review the final diff for unchanged application behavior and document any intentional test-only API substitutions; verify only the migration’s configuration, dependency, setup, and test updates are included.
