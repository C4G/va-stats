## Why

The project has unit tests but no browser-level coverage for authentication. A repeatable local fixture and an automated login journey will catch integration failures across Better Auth, Prisma, the running app, and the browser before changes are merged.

## What Changes

- Add Playwright as the browser end-to-end test runner and a documented command for running the login journey locally.
- Add an idempotent seed script that creates one staff user for each role offered by the staff form, one course, one batch for that course, and one student enrolled in that batch. Provide a verified password credential for the login fixture without sending email.
- Run the seeded login end-to-end test in pull request CI against the already-built app and its disposable local MySQL service.
- Keep the seed and CI fixture isolated from production data and safe to run repeatedly.

## Capabilities

### New Capabilities

- `e2e-testing`: Defines the seeded test data, login journey, and local/CI execution requirements for browser end-to-end tests.

### Modified Capabilities

None.

## Impact

- Adds Playwright and browser test configuration, test sources, and package scripts.
- Adds a Prisma-backed development/CI seed script for `vausers`, Better Auth credentials, `vacourses`, `vabatches`, `vastudents`, and `vastudent_to_batch`.
- Updates `.github/workflows/ci.yaml` and the CI Docker Compose overlay so the runner can reach the disposable database and app.
- Does not change production authentication behavior or application data models.
