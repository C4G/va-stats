# Prisma migration inventory

Captured on the `feature/switch-db-queries-to-prisma` branch.

## Current database access

- 57 TypeScript files import `@/lib/db` and call `executeQuery`.
- `lib/db.ts` creates and closes a `mysql2/promise` connection for each call.
- `lib/auth.ts` owns a separate `mysql2/promise` pool for the custom `vausers` lookup and Better Auth database adapter.
- Prisma 7.10.0 is installed, the schema is valid, and the repository currently has no shared application Prisma client module.

## Domains

- Configuration: `utils/dropdown-config.ts`, `utils/batch-status-rules-config.ts`
- Courses/batches: course and batch CRUD, batch details/reports, enrollment counts/trends
- Users/auth: user CRUD/dropdowns/counts, `lib/auth.ts`
- Students/enrollment: student CRUD, registration, duplicate checks, student/batch membership
- Attendance/grades/fees: attendance, assignments, grades, fee/document updates
- Remarks/audit: VA remarks, telecaller remarks, audit log routes
- Metrics: monthly count routes and dashboard/report data

## Baseline commands

- `pnpm type-check`: passed
- `pnpm prisma validate`: passed
- `pnpm test -- --runInBand`: pre-existing failure; no tests found
- `pnpm build`: compiled successfully and generated all static pages; the command did not return cleanly in the current tool session and needs repeat verification after implementation.
