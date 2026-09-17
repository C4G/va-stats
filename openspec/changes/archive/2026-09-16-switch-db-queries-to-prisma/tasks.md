## 1. Baseline and Prisma foundation

- [x] 1.1 Inventory every `executeQuery`, `lib/db`, direct `mysql2`, and SQL call in application code, group callers by domain, and verify the inventory is committed in the change notes or task evidence.
- [x] 1.2 Capture baseline `pnpm type-check`, `pnpm test`, `pnpm build`, and representative API/auth response fixtures, recording any pre-existing failures so migration regressions are distinguishable.
- [x] 1.3 Audit Prisma models, relations, enums, nullability, database column mappings, and generated-client availability against the migration SQL and all inventory queries; verify any required model correction is explicitly identified before route conversion.
- [x] 1.4 Add the shared server-only Prisma client singleton with development hot-reload reuse and production-safe lifecycle behavior; verify Prisma generation and a focused client initialization test/check succeed.
- [x] 1.5 Define the database-access conventions for typed `select`/`include`, request validation, response normalization, `$transaction`, and the documented parameterized raw-SQL exception; verify the conventions are applied in one pilot route.

## 2. Configuration, courses, batches, and user domains

- [x] 2.1 Convert dropdown and batch-status configuration utilities to Prisma model operations, preserving uniqueness checks, ordering, upserts, and validation errors; verify their unit tests and type-check pass.
- [x] 2.2 Convert course creation, update, deletion, listing, and course-count routes to typed Prisma queries while preserving response keys and status codes; verify targeted course API tests pass.
- [x] 2.3 Convert batch creation, listing, update, deletion, details, reports, enrollment counts, and yearly-trend routes, using typed relations/aggregates or documented raw-SQL exceptions; verify targeted batch/report tests and response fixtures pass.
- [x] 2.4 Convert user listing, creation, update, deletion, dropdown, and count routes to generated `vausers` types and enum values; verify targeted user API tests and type-check pass.

## 3. Students and enrollment

- [x] 3.1 Convert student lookup, detail, listing, unassigned-student, duplicate-check, document/fee, and student-count routes to typed `vastudents` selections and relations; verify nullable fields and serialized date/BigInt response fixtures match the baseline.
- [x] 3.2 Convert student application and bulk-registration writes to Prisma `create`/`createMany` or typed transactions, preserving legacy field normalization and duplicate behavior; verify success, validation failure, and duplicate scenarios.
- [x] 3.3 Convert add/remove-student-to-batch and batch-status mutations to typed relation operations and transactions, preserving attendance, grade, fee, and student status side effects; verify mutation tests cover success and partial-failure behavior.

## 4. Attendance, grades, fees, and remarks

- [x] 4.1 Convert attendance patch and batch-attendance routes to typed updates/upserts/transactions, preserving date handling, status codes, and existing no-duplicate behavior; verify representative present/absent/cancelled scenarios.
- [x] 4.2 Convert assignment creation/update/deletion and grade update routes to generated `va_assignments`/`va_grades` types; verify grade validation, lookup, mutation, and response behavior.
- [x] 4.3 Convert fee and document update routes to typed `va_fees` and `vastudents` mutations; verify all fee fields, nullable student IDs, and error responses against baseline fixtures.
- [x] 4.4 Convert VA remarks and telecaller remarks list/create/update/delete routes to typed relations and ownership filters; verify authorization/ownership failures and serialized response shapes.

## 5. Reports, metrics, and audit

- [x] 5.1 Convert monthly count routes for batches, courses, enrollments, instructors, leads, and TAs to typed aggregate queries; verify count values and zero-result behavior.
- [x] 5.2 Convert dashboard/report data routes and complex enrollment/payment metrics to Prisma aggregates, relations, and explicitly typed parameterized raw queries only where required; verify representative report totals and date filters match baseline fixtures.
- [x] 5.3 Convert audit create/get routes to typed `va_audit_logs` operations, preserving JSON details, filtering, pagination, and count behavior; verify audit payload and pagination tests.

## 6. Authentication and dependency cleanup

- [x] 6.1 Replace `findVaUser` in `lib/auth.ts` with a Prisma `vausers` lookup while preserving case-insensitive email matching and custom session/user fields; verify sign-in, session refresh, missing-user, and revoked-access scenarios.
- [x] 6.2 Determine whether the installed Better Auth version has a supported Prisma adapter for the existing auth models; if compatible, migrate and verify all auth tables/hooks, otherwise keep the adapter’s required MySQL integration isolated and document why it remains.
- [x] 6.3 Remove `lib/db.ts`, generic query result types, and all obsolete imports after repository searches show no application callers; verify `rg` finds no `@/lib/db`, `executeQuery`, or accidental query-row typing.
- [x] 6.4 Remove `mysql2` from runtime dependencies only if Better Auth and all remaining application code no longer require it; verify a clean dependency install and production build.

## 7. Validation and rollout

- [x] 7.1 Add or update unit/integration tests for Prisma query modules, response normalization, transaction failure handling, raw-query exceptions, and client lifecycle; verify `pnpm test` passes.
- [x] 7.2 Run `pnpm type-check` and confirm database-backed code uses generated Prisma types without broad `unknown`/generic row fallbacks or unvalidated request data in Prisma inputs.
- [x] 7.3 Run formatting, lint, Prisma validation/generation, and `pnpm build`; verify no route discovery, server/client boundary, or serialization errors are introduced.
- [x] 7.4 Run representative authenticated read/write/report smoke checks against the test database and compare response fixtures, mutation side effects, and error/status behavior with the baseline.
- [x] 7.5 Perform a final repository audit for unapproved SQL, direct connection creation, stale dependency/config references, and undocumented raw-query exceptions; record the final verification results in the change handoff.
