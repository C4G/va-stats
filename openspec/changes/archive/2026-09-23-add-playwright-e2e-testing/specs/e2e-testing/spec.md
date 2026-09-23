## Purpose

Provides a repeatable, isolated browser test environment for exercising the application's real authentication flow against a seeded database.

## ADDED Requirements

### Requirement: Seeded end-to-end fixture

The project MUST provide a repeatable seed operation that creates or updates one active staff user for each role offered by the staff form: `STAFF`, `MANAGEMENT`, `ADMINISTRATOR`, `TELECALLER`, `TRAINER`, and `TRAINERPLUSTELECALLER`. It MUST also create or update one course, one batch referring to that course, one student, and the student's assignment to that batch. The fixture MUST include a verified Better Auth email/password identity for the designated login user and MUST NOT require sending email.

#### Scenario: Seed an empty test database

- **WHEN** the seed operation runs against an empty permitted test database
- **THEN** the database contains one fixture staff user for each listed role, one course, one batch for that course, one student assigned to that batch, and a verified login credential for the designated fixture user

#### Scenario: Repeat the seed operation

- **WHEN** the seed operation runs more than once against the same database
- **THEN** it updates or reuses its fixture records without creating duplicate fixture users, courses, batches, students, assignments, or login credentials

### Requirement: Isolated seeded data

The seed operation MUST be limited to an explicitly local or disposable test database, MUST identify its fixture records deterministically, and MUST NOT delete unrelated records. The local end-to-end instructions MUST state the fixture login credentials and database prerequisites.

#### Scenario: Refuse an unsafe database target

- **WHEN** the seed operation is configured with a production or otherwise non-permitted database target
- **THEN** it exits with a clear error before writing data

#### Scenario: Preserve unrelated database records

- **WHEN** the seed operation runs in a database that contains unrelated records
- **THEN** those records remain unchanged

### Requirement: Browser login coverage

The project MUST provide a browser end-to-end test that enters the seeded user's email and password through the sign-in page and verifies successful authentication and arrival at the authenticated `/default` page.

#### Scenario: Successful email and password login

- **WHEN** the end-to-end test opens the sign-in page and submits the designated fixture user's valid credentials
- **THEN** the browser reaches `/default` with an authenticated session for that fixture user

### Requirement: Local and CI execution

The end-to-end test MUST be runnable through a documented project command against a local application and local MySQL database. Pull request CI MUST seed its disposable MySQL database, run the test against the application built for that pull request, and fail the check if seeding, startup, or the login test fails.

#### Scenario: Run end-to-end coverage in pull request CI

- **WHEN** a pull request runs the CI workflow
- **THEN** CI uses its disposable MySQL database and pull request app build to seed and execute the browser login test before reporting success

#### Scenario: Run end-to-end coverage locally

- **WHEN** a developer follows the documented local command with the test database and application available
- **THEN** the fixture is seeded and the browser login test runs against that local application
