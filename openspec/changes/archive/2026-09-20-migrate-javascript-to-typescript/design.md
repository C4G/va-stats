## Context

The repository uses Next.js 14 Pages Router with JavaScript and JSX enabled alongside a small, growing TypeScript surface. `tsconfig.json` currently uses `allowJs`, keeps strict mode disabled while enabling `strictNullChecks`, and does not include the main `pages`, `components`, `lib`, or `utils` JavaScript tree in a useful typed migration boundary. See `proposal.md` for the motivation and intended scope.

The migration crosses browser code, server-only API routes, database helpers, authentication code, Jest tests/setup, and build configuration. The application must continue to expose the same pages, API routes, response payloads, authentication behavior, and database behavior throughout the work.

## Goals / Non-Goals

**Goals:**

- Establish `.ts`/`.tsx` as the only authored application source extensions, with the installed Next.js 14 loader's required `next.config.js` and PostCSS loader's required `postcss.config.js` as documented authored JavaScript toolchain exceptions.
- Make the compiler cover all converted pages, API handlers, components, libraries, utilities, tests, and supported tool configuration.
- Define reusable types at existing shared boundaries, especially database records, API payloads, authentication/session values, table/grid rows, forms, and report data.
- Keep each migration batch buildable and behavior-preserving.
- Finish with JavaScript disabled in the TypeScript project and with CI checks that prevent new authored JavaScript from returning.

**Non-Goals:**

- Changing routes, HTTP methods/status codes, JSON response shapes, database schema/queries, authentication policy, UI behavior, or deployment topology.
- Replacing React, Next.js, Prisma, Jest, or the current data-fetching and styling approaches.
- Converting the required `next.config.js` and `postcss.config.js`, generated `.next` output, generated PWA service-worker assets, third-party code, or the static DreamHost HTML deliverables.
- Enabling unrelated architectural cleanup or a broad strict-mode rewrite unless it is required to type a migrated module safely.

## Decisions

### Convert in dependency layers

Migrate shared types and low-level utilities first, then server libraries/database and API routes, then reusable components, pages, tests, and configuration/documentation. Within each layer, rename files and update imports together. This minimizes periods where a converted module has to model an untyped downstream dependency and allows `pnpm type-check`, tests, and builds to gate each batch.

Alternative considered: rename everything in one mechanical pass and type afterward. That creates a large broken intermediate state and makes API versus browser typing failures difficult to isolate.

### Preserve framework entry points while changing only their source extension

Keep the existing Pages Router paths and dynamic route names (`pages/api`, `[id]`, `_app`, `_document`, and `404`) and convert them to the corresponding `.ts`/`.tsx` entry points. Update `next.config` page extensions so only the final TypeScript extensions are accepted for authored pages.

Alternative considered: move to the App Router during the migration. That would combine a routing migration with a language migration and would change framework behavior beyond this change.

### Type external boundaries explicitly

Use Next.js request/response types for API handlers, React types for component props and events, Prisma-generated types where they represent database records, and shared domain types under `utils/types` for values crossing multiple modules. Treat parsed request bodies, query strings, `fetch` JSON, and database results as unknown or narrowly typed data until validated. Use small targeted declaration files for third-party gaps rather than broad `any` escapes.

Alternative considered: add only file extensions and rely on inference. That would technically compile but would leave the most important JavaScript boundaries weakly typed and provide little protection against contract drift.

### Reject explicit type assertions

Configure ESLint to reject TypeScript assertion syntax (TSAsExpression and TSTypeAssertion) throughout authored TypeScript. Migrated code must express contracts with named types, generic APIs, discriminated unions, runtime validation, and control-flow narrowing; as any is not an accepted migration escape hatch. Existing assertion sites are removed or redesigned as part of the migration.

Alternative considered: allow assertions except as any. That would still permit assertion-based workarounds to hide contract mismatches and would make the no-casting policy difficult to enforce consistently.

### Keep compiler strictness stable during the migration

Retain the current `strict: false` and `strictNullChecks: true` baseline while converting, but do not use `any` as a blanket migration strategy. The final change removes `allowJs`, includes the complete TypeScript source tree, and records remaining intentional escape hatches for later hardening. A separate strict-mode initiative can then address the accumulated typed surface without coupling it to file conversion.

Alternative considered: enable `strict: true` as the first step. This would increase the migration's failure surface substantially and mix source conversion with a separate correctness-hardening project.

### Treat configuration as a compatibility boundary

Convert authored configuration/setup modules to TypeScript only where the installed toolchain can load them without an additional runtime transpilation dependency. Next.js 14 explicitly requires `next.config.js`, and the installed Next.js/PostCSS loader does not process `postcss.config.ts` during development, so retain `next.config.js` and `postcss.config.js` as documented exceptions. TypeScript remains the supported form for the remaining tool configurations. For other tools whose loader requires a specific format, use the supported typed or data configuration form and verify it in CI; do not silently leave duplicate JS and TS configurations. Update Jest setup, coverage patterns, and test discovery to include `.ts`/`.tsx`.

Alternative considered: keep all JavaScript configuration indefinitely. That would leave authored JavaScript in the repository and permit the migration to regress at the toolchain boundary.

## Risks / Trade-offs

- [Risk] Renaming Next.js pages or API routes can alter route discovery or dynamic route precedence. → Preserve every route-relative path and validate the production build plus representative page/API smoke checks after each route batch.
- [Risk] Adding types exposes existing inconsistencies in database rows, request payloads, and UI state. → Introduce shared types at boundaries, narrow incrementally, and keep runtime validation/normalization behavior unchanged.
- [Risk] Tool configuration loaders may not accept TypeScript with the current dependency versions. → Verify each loader before conversion, use its documented supported typed/data format, and add only the minimum compatible type/runtime dependency if required.
- [Risk] A partial migration could leave duplicate modules or extension-sensitive imports. → Maintain an inventory, perform repository-wide extension/import searches at the end, and make `allowJs: false` and a clean build final gates.
- [Risk] Type-only edits can accidentally change server/client bundling or environment-variable access. → Preserve import direction and server-only boundaries, especially database/auth/audit modules, and run production build and deployment-image checks.
- [Risk] The migration is large enough to make review and rollback difficult. → Organize work into dependency-layer batches with green checks, use ordinary file renames, and roll back the migration commit/artifact without touching the database.

## Migration Plan

1. Capture the authored JavaScript inventory and current validation baseline; identify generated/static exclusions and any extension-sensitive imports.
2. Add or consolidate shared domain types, then convert utility and library modules while preserving exports and runtime normalization.
3. Convert server-only database/auth helpers and all API routes, typing request/query/body inputs and response contracts without changing endpoint behavior.
4. Convert reusable components and all Pages Router pages, including dynamic routes and framework files, then update imports and CSS-module typings as needed.
5. Convert tests and test setup/configuration, update coverage globs, and convert supported build/lint/format configuration modules.
6. Change the compiler/framework end state: remove JavaScript allowance, remove obsolete JS configuration, include the complete TS/TSX tree, restrict page extensions to the final authored formats, and retain only the documented `next.config.js` and `postcss.config.js` toolchain exceptions.
7. Update documentation and migration-sensitive references, then run formatting, lint, type-check, Jest, production build, and targeted route/API smoke checks.
8. Deploy through the existing test environment and verify representative authentication, database-backed pages, API mutations, reports/CSV output, and PWA behavior. Promote only after the same artifact passes the current release checks.

Rollback is a source/deployment rollback to the last known-good commit or image. No database or external API migration is part of this change, so rollback does not require data reversal. If a batch cannot be made green, retain the prior file format for that batch while `allowJs` remains enabled and continue only after resolving the boundary; the final enforcement step happens once all authored modules are converted.

## Open Questions

None that change the migration approach. Exact type names and whether an individual tool configuration can use `.ts` can be resolved during implementation after checking the installed tool versions.
