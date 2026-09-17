## Why

The application has a Prisma schema and generated client available, but most API routes and utilities still issue untyped SQL through `lib/db.ts`, while authentication maintains a separate direct MySQL query path. This creates weak `Record<string, unknown>` boundaries, duplicates connection handling, and prevents Prisma model types, relations, enums, and checked input types from protecting database-backed code.

## What Changes

- Replace all application queries currently routed through `lib/db.ts` with Prisma Client model operations and generated Prisma types.
- Migrate the direct `mysql2` query in `lib/auth.ts` to the shared Prisma client so all application-owned reads and writes use one typed database access layer.
- Add a server-only, reusable Prisma client module with the repository’s expected development and production lifecycle behavior.
- Convert SQL joins, filters, ordering, aggregates, mutations, and transactions to typed Prisma queries, preserving existing endpoint response shapes and runtime behavior.
- Use Prisma relations, `select`/`include`, enums, generated input types, and explicit result types at API and utility boundaries; eliminate generic query-row/mutation-result typing from application code.
- Use parameterized Prisma raw SQL only for operations that cannot be represented without changing behavior, with a documented and narrowly typed exception policy.
- Remove `lib/db.ts`, its MySQL connection-per-query implementation, and any now-unused `mysql2` application dependency after all callers are migrated.
- Add or update tests and validation so type-checking fails when query results or mutation inputs bypass Prisma-generated types.

## Capabilities

### New Capabilities

None. This is a behavior-preserving data-access refactor and type-safety improvement.

### Modified Capabilities

None. Existing routes, response payloads, authentication behavior, and database semantics remain unchanged.

## Impact

- Affects every API route and utility importing `lib/db.ts`, plus `lib/auth.ts`.
- Affects the shared server database client, Prisma schema/model mappings where gaps are discovered, and database-related tests.
- Removes the application’s generic SQL query abstraction and likely removes direct `mysql2` usage after confirming Better Auth’s adapter requirements.
- Requires verification across type-checking, unit tests, production build, representative read/write API routes, authentication hooks, transactions, and database error handling.
- No database migration or user-facing API change is intended; any schema correction required to faithfully model existing columns must be separately reviewed before implementation.
