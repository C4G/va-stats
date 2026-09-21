## 1. Baseline and migration guardrails

- [x] 1.1 Create a checked-in inventory of authored `.js`/`.jsx` files and extension-sensitive imports, explicitly excluding `.next`, generated PWA files, third-party code, DreamHost static assets, and the required `next.config.js`/`postcss.config.js` exceptions; verify the inventory accounts for the 96 `.js` and 44 `.jsx` migration candidates.
- [x] 1.2 Capture the pre-migration validation baseline and document any existing failures; verify `pnpm type-check`, `pnpm exec jest --runInBand`, `pnpm lint`, `pnpm format`, and `pnpm build` results are recorded for comparison.
- [x] 1.3 Add a repeatable repository audit for forbidden authored JavaScript and duplicate route/module paths; verify it passes before the final enforcement step and produces actionable paths when a `.js`/`.jsx` file is present.

## 2. Shared types and utility layer

- [x] 2.1 Consolidate reusable domain types under `utils/types` for database rows, API payloads, sessions/users, attendance/enrollment, batches/courses/students, forms, tables/grids, reports, and CSV data; verify existing TypeScript modules still pass `pnpm type-check`.
- [x] 2.2 Convert the general-purpose utility modules in `utils` to `.ts`, preserving exports, normalization rules, CSV/report behavior, sorting/comparison behavior, and browser/server boundaries; verify `pnpm type-check` and the existing sort utility test pass.
- [x] 2.3 Convert the batch and student utility modules, including column definitions and browser fetch helpers, to `.ts` with typed rows, options, and response data; verify all imports resolve and `pnpm type-check` passes.
- [x] 2.4 Convert `lib` and remaining server utility modules, including database, authentication compatibility, sessions, and audit logging, to `.ts`; verify server-only imports remain out of client bundles with `pnpm build`.

## 3. API route migration

- [x] 3.1 Establish shared API handler/request parsing types and response helpers using Next.js request/response types; verify representative malformed query/body inputs still return their existing status codes and error payloads in route tests or local handler tests.
- [x] 3.2 Convert count, dashboard, course, batch, student, and user read/report API routes under `pages/api` to `.ts`, typing query parameters, database results, normalized responses, and error handling without changing endpoint contracts; verify `pnpm type-check` and the generated production route list succeed.
- [x] 3.3 Convert batch, course, assignment, attendance, grade, student, fee, and user mutation API routes to `.ts`, retaining validation, authorization, SQL/database operations, and response shapes; verify `pnpm type-check` plus targeted success, validation-error, unauthorized, and server-error checks for each route family.
- [x] 3.4 Convert configuration, dropdown, audit, remarks, diagnostics, and remaining API routes to `.ts`, including dynamic `[id]` handlers; verify every existing `pages/api/**/*.js` route has exactly one `.ts` counterpart and `pnpm build` passes.
- [x] 3.5 Compare the pre- and post-migration API route inventory and smoke-test representative GET, POST, PATCH, and DELETE endpoints against a local database/test environment; verify HTTP methods, status codes, authentication checks, and JSON keys are unchanged.

## 4. Component migration

- [x] 4.1 Convert shared layout, navigation, button, modal, menu, and form components to `.tsx`, typing props, callbacks, refs, form values, and browser events while preserving CSS-module usage; verify `pnpm type-check` and affected component tests/build compilation pass.
- [x] 4.2 Convert grid, batch, student, remarks, and cell-renderer components to `.tsx`, reusing shared row/column types and preserving AG Grid callback contracts; verify `pnpm type-check` and a production build compile all renderers.
- [x] 4.3 Audit component imports and client/server boundaries after the rename; verify no duplicate `.js`/`.jsx` component modules or extension-sensitive imports remain in `components`.

## 5. Pages Router migration

- [x] 5.1 Convert framework, error, authentication, account, and document entry points (`_app`, `_document`, `404`, auth pages, security, and logs) to `.tsx` or `.ts` as appropriate; verify route discovery and authentication redirects with `pnpm build` and targeted browser smoke checks.
- [x] 5.2 Convert dashboard, configuration, course, batch, student, user, and report pages to `.tsx`, typing page state, query/router parameters, fetch responses, forms, tables, and chart data; verify representative page renders and `pnpm type-check`.
- [x] 5.3 Convert registration, bulk-registration, demo, default, and remaining top-level pages plus dynamic `[id]` pages to `.tsx`; verify every existing `pages/**/*.jsx` page has exactly one `.tsx` counterpart and dynamic routes render with valid and invalid IDs.
- [x] 5.4 Compare the pre- and post-migration Pages Router route inventory, including API routes and special files; verify no route path, link target, redirect, or page-level data-fetch behavior changed.

## 6. Tests and toolchain configuration

- [x] 6.1 Convert Jest setup and configuration to the supported TypeScript or data configuration form for the installed Jest/Next toolchain; update test discovery and coverage globs to include `.ts`/`.tsx`, and verify `pnpm exec jest --runInBand` passes with coverage collection targeting the migrated source.
- [x] 6.2 Convert authored Next.js, Tailwind, and PostCSS configuration modules to the supported TypeScript form where the installed loaders permit it, adding only required type/runtime support; verify `pnpm lint`, `pnpm format`, and `pnpm build` load the configurations successfully.
- [x] 6.3 Rename the remaining authored utility tests to `.ts` where they contain no JSX and add or preserve typed fixtures/assertions; verify the full Jest suite passes and coverage does not silently drop because of extension changes.
- [x] 6.4 Remove obsolete JavaScript project configuration, set `allowJs` to false, include the complete authored `**/*.ts`/`**/*.tsx` tree, preserve path aliases and Next.js plugin behavior, and restrict `pageExtensions` to the final authored extensions; verify `pnpm type-check` fails on a temporary forbidden-JS sentinel and passes after its removal.

- [x] 6.5 Add ESLint restrictions for TSAsExpression and TSTypeAssertion, remove all assertion-based migration workarounds, and verify `pnpm lint` fails on a temporary cast sentinel and passes after its removal.

## 7. Documentation, dependency, and repository cleanup

- [x] 7.1 Update README, comments, scripts, lint-staged patterns, and operational references from `.js`/`.jsx` paths to `.ts`/`.tsx`; verify repository-wide searches find no stale authored paths except explicitly documented generated/static exclusions.
- [x] 7.2 Add or adjust required TypeScript declaration dependencies and module declarations for CSS modules, JSON, third-party packages, and test/framework globals; verify the lockfile is consistent and `pnpm install --frozen-lockfile` succeeds.
- [x] 7.3 Remove duplicate or obsolete JavaScript source/config files after each TypeScript counterpart is validated; verify the authored inventory contains no `.js`/`.jsx` files outside the documented `next.config.js` and `postcss.config.js` exclusions.

## 8. Full validation and rollout

- [x] 8.1 Run the complete local quality gate—`pnpm format`, `pnpm lint`, `pnpm type-check`, `pnpm exec jest --runInBand`, and `pnpm build`—and resolve all migration-introduced failures; verify all commands exit successfully.
- [x] 8.2 Run targeted end-to-end smoke checks in the local/test environment for sign-in/session handling, database-backed dashboard and CRUD flows, reports/CSV output, API mutations, dynamic pages, and PWA/static asset behavior; verify observed behavior matches the baseline.
- [x] 8.3 Build and deploy the existing test container/image through the normal pipeline, verify representative health/auth/API/page checks and runtime environment-variable behavior, and record the artifact/commit eligible for promotion. The migration was subsequently merged as commit `48900b0` (PR #8) and deployed to the testing environment.
- [x] 8.4 Confirm rollback readiness by documenting the last known-good image/commit and verifying no database or external API migration is required to restore it.
