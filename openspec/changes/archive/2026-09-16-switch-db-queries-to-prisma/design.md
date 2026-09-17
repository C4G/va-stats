## Context

The Prisma schema is split across `prisma/models` and `prisma/enums` and already models the primary application tables and relations. The application has no shared Prisma client yet. Instead, 57 TypeScript API/utilities import `lib/db.ts`, which opens a MySQL connection per call and exposes rows as `Record<string, unknown>`; `lib/auth.ts` also owns a separate MySQL pool for a custom `vausers` lookup and passes that pool to Better Auth.

The migration must preserve Pages Router endpoints, existing JSON shapes, legacy column names and enum values, MySQL behavior, and the Better Auth integration. Some current SQL contains joins, aggregates, dynamic filters, upserts, or vendor-specific expressions that may require a deliberately typed raw-query exception rather than a semantic rewrite.

## Goals / Non-Goals

**Goals:**

- Establish one shared server-side Prisma Client entry point for application-owned database access.
- Replace generic query/mutation result handling with generated model, enum, relation, and input types.
- Preserve existing API behavior, response keys, error behavior, transaction boundaries, and database semantics.
- Make raw SQL exceptional, parameterized, locally typed, and easy to audit.
- Verify the migration with compiler, test, build, and representative database-backed route checks.

**Non-Goals:**

- Redesigning endpoint payloads, route structure, UI behavior, authentication policy, or database schema.
- Replacing Better Auth's internal database adapter unless the installed Better Auth version provides a compatible Prisma adapter and the migration can preserve its required schema and behavior.
- Converting reporting queries to a new data model or optimizing queries beyond what is required to preserve behavior.
- Adding a broad strict-mode or unrelated type-safety initiative.

## Decisions

### Use a singleton Prisma client module

Create a server-only module such as `lib/prisma.ts` that exports a single `PrismaClient`, with development global reuse to avoid exhausting connections during hot reload and normal production singleton behavior. The module will be the only normal import boundary for `@prisma/client` in application code.

Alternative considered: instantiate `PrismaClient` in every route. This would duplicate lifecycle behavior and can create too many connections during development and serverless execution.

### Migrate by domain and preserve route response mapping

Group routes by domain—configuration, courses/batches, students/enrollment, attendance/grades/fees, users/auth, remarks, audit, and reporting. Replace each SQL statement with a typed Prisma operation, then map the selected records to the existing response shape at the route boundary where SQL aliases or date formatting were previously used. Prefer explicit `select` objects over `include` when the endpoint only needs a subset.

Alternative considered: expose Prisma records directly from every route. That would leak schema naming and Date/BigInt serialization details into the public API and would change response contracts.

### Prefer relations and typed aggregate operations

Use Prisma relations for joins and nested writes, `where`/`orderBy`/`select` for filtering and projection, `count`/`aggregate`/`groupBy` for supported metrics, and `$transaction` for multi-step mutations that currently depend on ordered statements. Use generated enum values rather than string literals for modeled enums.

Alternative considered: retain SQL strings behind a new wrapper. That would preserve the weak result typing and would not deliver the requested Prisma type safety.

### Constrain raw SQL to a typed exception path

When Prisma cannot express a MySQL-specific query without changing behavior, use `$queryRaw`/`$executeRaw` with Prisma template-tag parameterization. Define a local result type for each raw query and keep the query in the owning domain module. Dynamic identifiers must come from an allowlisted mapping, never interpolated request input. Each exception will be documented with why the typed model API is insufficient.

Alternative considered: force every query through Prisma model APIs. This risks changing report totals, date/string semantics, regex filtering, or upsert behavior in legacy MySQL queries.

### Keep data normalization explicit at external boundaries

Use generated Prisma result types internally, then explicitly normalize values needed by JSON responses: dates, BigInt fields, nullable legacy columns, counts, and enum strings. Request bodies and query parameters remain runtime-validated before being used in Prisma `where` or `data` objects. No generic `QueryRow`, `QueryResult`, or unchecked cast-based escape hatch will replace the old helper.

Alternative considered: serialize Prisma results generically. That hides nullable/BigInt/date issues and weakens the type contract at exactly the route boundary being improved.

### Separate application queries from Better Auth adapter ownership

Move `findVaUser` to Prisma because it is an application-owned query. Keep Better Auth's database option on its supported adapter unless a compatible Prisma adapter is available for the installed version; if one is available, evaluate it as a focused subtask and verify the Better Auth tables and lifecycle hooks before changing it. This avoids pretending that an adapter swap is safe while still removing the hand-written custom MySQL lookup.

Alternative considered: replace Better Auth's adapter without compatibility verification. That could break session, account, passkey, verification, or transaction behavior even if application routes compile.

## Risks / Trade-offs

- [Risk] Prisma model field types or relations do not fully match legacy columns and nullability. → Compare every migrated statement with the schema and migration SQL; correct only clearly missing Prisma mappings and require explicit review for schema-affecting changes.
- [Risk] Date, BigInt, enum, alias, or count serialization changes API responses. → Preserve existing response mappers and add fixture-level assertions for representative endpoints.
- [Risk] Converting multi-statement mutations changes atomicity or ordering. → Use `$transaction` only where the existing operation is logically a unit, and test partial-failure behavior before and after migration.
- [Risk] Raw SQL exceptions preserve behavior but reduce type safety. → Parameterize them, define exact result types, allowlist identifiers, document each exception, and track them for future reduction.
- [Risk] A shared client or Better Auth adapter change causes connection leaks or authentication regressions. → Add lifecycle tests/checks, keep adapter changes isolated, and run sign-in, session, password, and passkey smoke checks.
- [Risk] The large route count makes incomplete migration easy to miss. → Use repository-wide searches for `lib/db`, `mysql2`, `executeQuery`, and unapproved SQL after each domain batch and make type-check/build gates mandatory.

## Migration Plan

1. Inventory every `executeQuery` call, direct MySQL query, response shape, transaction-like sequence, and Prisma schema mismatch; capture current type-check, test, and build baselines.
2. Add the shared Prisma client module and test its initialization/lifecycle behavior without changing route code.
3. Migrate low-risk configuration, course, batch, user, and remark endpoints in domain batches, adding typed selects, mutations, relation queries, and response mappers.
4. Migrate student enrollment, attendance, grades, fees, bulk operations, and multi-statement mutations with explicit transaction decisions.
5. Migrate reports, dashboard counts, audit queries, dropdown utilities, and dynamic-filter paths; document any remaining raw SQL exception.
6. Migrate the custom authentication `vausers` lookup to Prisma and separately verify whether Better Auth's adapter should remain MySQL-backed or can safely use Prisma.
7. Remove `lib/db.ts` and its exported generic query types once repository searches show no callers; remove `mysql2` only if no supported Better Auth or other runtime integration still requires it.
8. Run formatting, lint, type-check, Jest, production build, Prisma validation/generation, and targeted API/auth/database smoke checks. Compare representative response fixtures and mutation results against the baseline.

Rollback is a source/deployment rollback to the last known-good commit. No data migration is planned; if a Prisma mapping requires a database migration, pause that route batch and review it separately rather than applying an implicit schema change.

## Open Questions

- Whether the installed Better Auth release exposes a supported Prisma adapter compatible with the existing `user`, `account`, `session`, `verification`, and `passkey` models. This can be resolved during the auth batch without changing the overall application-query migration approach.
