## Context

The project is a Next.js 14 application using TypeScript, React Testing Library, and four currently discovered tests. Jest is configured through `next/jest` with a jsdom environment, the `@/` alias, setup-time mocks, coverage thresholds, and separate test/watch/coverage package scripts. The migration must account for tests that currently use Jest globals and a direct `jest.fn()` call.

## Goals / Non-Goals

**Goals:**

- Establish Vitest as the single test runner and preserve the current developer-facing test script variants.
- Preserve jsdom behavior, TypeScript path resolution, setup initialization, test discovery, coverage collection, and the 70% global coverage thresholds.
- Preserve existing mock behavior while making test globals and mock factories explicit where Vitest differs from Jest.
- Set the temporary global coverage gate to the current baseline level: 2% for branches, lines, and statements, and 1% for functions because the observed baseline is below 2% for that metric.
- Keep the migration reversible until the Vitest suite and coverage checks pass.

**Non-Goals:**

- Changing application runtime code, test assertions, or product behavior except where a test-runner API requires an equivalent expression.
- Adding new test cases or changing the project’s coverage targets.
- Introducing a second test runner or retaining Jest as a supported package script after migration.

## Decisions

1. **Use Vitest with a repository-level TypeScript config and setup file.**
   Configure Vitest for jsdom, global test APIs, the existing `@/` alias, and the current test file patterns. This keeps the setup discoverable and avoids coupling the test runner to Next.js’s `next/jest` adapter, which is Jest-specific.

   Alternatives considered: retain `next/jest` while adding Vitest, which would leave two competing runners and duplicate configuration; use a JavaScript config, which would be inconsistent with the existing TypeScript tooling.

2. **Use Vitest’s Jest-compatible assertion and mocking surface only where it preserves intent.**
   Keep `describe`, `it`, `expect`, and related globals enabled for minimal test churn, while converting `jest.mock`/`jest.fn` references to `vi.mock`/`vi.fn` and importing `vi` where required. Keep `@testing-library/jest-dom` loaded through the setup file using the Vitest-compatible matcher integration.

   Alternatives considered: add a compatibility shim that aliases `jest` to `vi`, which obscures the migration and can hide API differences; rewrite all tests to explicit imports, which adds unnecessary churn for this small migration.

3. **Use Vitest coverage with the current collection scope and a temporary low baseline gate.**
   Configure coverage for the current `utils/**/*.{ts,tsx}` and `pages/api/**/*.{ts,tsx}` scope, preserve exclusions, and set thresholds to 2% for branches, lines, and statements plus 1% for functions. The function threshold is intentionally lower because the measured baseline is 1.41%; these are temporary migration-era gates rather than a quality target.

   Alternatives considered: drop coverage during the migration, which would weaken an existing quality gate; broaden coverage to the whole application, which changes the current gate rather than migrating it.

4. **Treat command and dependency replacement as an atomic migration.**
   Update `test`, `test:watch`, and `test:coverage` together with dev dependencies and remove obsolete Jest config/setup/type packages after the new commands pass. Keep the old files available only during the implementation work needed to compare behavior; they should not remain as supported configuration in the final state.

## Risks / Trade-offs

- **[Next.js transform or module-resolution differences]** → Configure aliases and transforms explicitly, then run type-check, the full test suite, and the application build.
- **[Jest and Vitest mock hoisting differ]** → Keep setup mocks at module scope, use Vitest APIs directly, and validate modules that depend on router/auth mocks.
- **[Coverage provider output or threshold behavior differs]** → Compare included/excluded files and threshold results before deleting Jest coverage configuration; retain the existing numeric thresholds.
- **[`@testing-library/jest-dom` matcher setup differs]** → Use the package’s Vitest-compatible setup import and include a matcher assertion in the verification run.
- **[Package-lock or pnpm lockfile drift]** → Update dependencies with the repository’s package manager and ensure the resulting lockfile is part of the reviewed change.

## Migration Plan

1. Add Vitest and required coverage/jsdom integration, create the Vitest config and setup, and translate the existing runner settings and mocks.
2. Update any test-only Jest API references and package scripts, then run the full test, watch, coverage, type-check, and build validations as appropriate.
3. Remove Jest configuration, setup, dependencies, and types; reinstall/refresh the pnpm lockfile and repeat the validations.
4. If migration validation fails, revert the configuration/dependency changes as one unit and retain the existing Jest setup until the incompatibility is resolved.

## Open Questions

None. The exact Vitest coverage provider can be selected during implementation based on the project’s supported Node/pnpm dependency set without changing the migration’s scope or acceptance criteria.
