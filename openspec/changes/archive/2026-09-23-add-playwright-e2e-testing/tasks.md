## 1. Seeded Test Fixture

- [x] 1.1 Add an idempotent Prisma seed script for the six staff roles, course, related batch, student assignment, and verified Better Auth login identity; verify it creates the expected records on an empty test database.
- [x] 1.2 Add database-target safety checks and stable fixture identifiers; verify a second seed run creates no duplicates and an unsafe target is rejected before writes.

## 2. Playwright Login Test

- [x] 2.1 Add Playwright, Chromium configuration, and a separate end-to-end package command; verify Playwright discovers the browser test.
- [x] 2.2 Implement the email/password login test using the seeded identity and assert the authenticated `/default` destination; verify it passes against a locally running app and seeded local MySQL database.
- [x] 2.3 Document local prerequisites, the seed and test commands, and disposable fixture credentials; verify a developer can follow the documented sequence.

## 3. Pull Request CI Integration

- [x] 3.1 Publish the disposable CI MySQL and app ports on loopback in the CI Compose overlay; verify the runner can connect to both services while the compose app remains healthy.
- [x] 3.2 Install Chromium in the CI runner, seed the disposable database, and run the Playwright login test against the PR app; verify the CI workflow fails when seeding or the browser test fails.
- [x] 3.3 Verify the workflow's always-run cleanup removes the compose project and disposable database volumes after both successful and failed end-to-end runs.
