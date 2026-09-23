## Context

See proposal.md for the motivation. The existing pull request workflow runs Node checks, then builds and starts the production Docker image with `docker-compose.ci.yml`, which provides disposable MySQL but does not publish the database or app ports to the runner. Prisma is configured from `MYSQL_*` environment variables. Better Auth requires verified email/password accounts and only admits email addresses found in `vausers`; the staff form currently offers six role values.

## Goals / Non-Goals

**Goals:**

- Reuse the CI image and disposable database already started by the workflow.
- Let the GitHub Actions runner seed that database and drive the app from a real browser.
- Make local runs reproducible with the same seed data and command shape.
- Keep fixture writes repeatable and constrained to a safe database target.

**Non-Goals:**

- Test Google OAuth, passkeys, registration, or password reset in this first browser test.
- Add production seed data or alter production authentication behavior.
- Cover application pages beyond the successful login destination.

## Decisions

1. **Run Playwright on the CI runner against the pull request's production app container.** Publish the app and disposable MySQL ports only on the loopback interface in the CI overlay. This exercises the image CI already builds and checks. Running a separate Next.js development server would test a different runtime; putting browsers in the application image would enlarge the deployed image and couple test tooling to production.

2. **Use one deterministic, idempotent Prisma seed fixture.** Use stable test-only emails and fixture identifiers, including the six role values in the staff form. Link the single batch to the seeded course and the single student through the existing student-to-batch relation. Re-running updates or reuses only fixture-owned rows; it never resets tables or removes unrelated data.

3. **Create the login account as already verified with a Better Auth-compatible password hash.** The seed script should use the supported Better Auth password hashing facility rather than implementing hashing itself, and create the Better Auth user/account records tied to the selected `vausers` email. This avoids email delivery and exercises the same credential format checked by the sign-in endpoint.

4. **Guard seed writes by database target.** The seed operation should require a local host or explicit test database marker, reject production mode and known production hosts, and use a clear opt-in override only where local container networking requires it. CI points it at the published loopback port of the disposable compose database. It should not issue broad cleanup or truncate commands.

5. **Expose a single documented end-to-end command and configure a headless Chromium project.** Keep the browser test separate from the existing Vitest unit suite so CI can run both and report failures clearly. Use an environment-provided base URL, defaulting to the local app URL.

## Risks / Trade-offs

- **A fixed local test password is not suitable for real accounts** → Restrict fixture identity creation to test databases and document that the credentials are disposable.
- **Schema constraints may make minimal fixture rows invalid** → Populate required fields and enum values from the Prisma schema, and keep this work in the seed implementation task.
- **Loopback port collisions on local machines** → Allow the local base URL and MySQL port to be configured while keeping CI's published ports explicit.
- **Browser installation increases CI time** → Install only Chromium and its required system dependencies.

## Migration Plan

No production migration is required. Add test dependencies and configuration, seed the disposable MySQL database after the app's migrations have completed, then run Playwright against the healthy app. CI cleanup must continue to remove the compose project and its volumes on both success and failure.
