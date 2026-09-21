# Validation

Validated 2026-09-16 against the staging-backed local environment and a disposable CI database.

The development styling regression was traced to `postcss.config.ts`: Next's PostCSS loader did not load the TypeScript filename, leaving Tailwind's `@tailwind` directives unprocessed. Restoring the loader-supported `postcss.config.js` and documenting it as a compatibility exception caused the generated utility selectors to appear in the browser.

## API route and contract smoke checks

- The pre-migration and current inventories each contain 67 API route files. The 64 changed entries are one-for-one `.js` to `.ts` replacements; no logical API route was added or removed.
- Staging-backed local read checks returned `200` for `/api/health`, `/api/countbatch`, `/api/countcourse`, `/api/countstudent`, `/api/getbatchesdata`, `/api/getcoursesdata`, and `/api/getstudentsdata`.
- The report endpoint returned `200` for `/api/getBatchesWithEnrollCount` with the report query parameters, returning 39 batches with the expected detailed fields.
- Authenticated local browser testing verified sign-in/session handling, report generation/download, and assessment-form updates against the staging-backed environment.
- The representative JSON object keys remained stable: `status,timestamp`; `count`; `batches`; `courses`; and `students`, respectively. Response values were not recorded.
- The protected remarks route returned `401` for unauthenticated `GET`, `POST`, `PATCH`, and `DELETE` requests. No mutation request reached an authenticated handler.

## Packaged image smoke checks

- `docker build --tag va-stats-typescript-smoke:local .` completed successfully.
- The image was run with `docker-compose.ci.yml` and a disposable MySQL 8.4 service. Migration `0_init` applied successfully and both services became healthy.
- In the packaged image, the health endpoint, representative database-backed GET APIs, application pages, dynamic/static page routes, `/manifest.json`, `/sw.js`, and `/favicon.ico` all returned successfully.
- Local image identifier: `sha256:bd79282121f1cf8f978811c8a12377299c9463f95f9979194ebef8f755ad9d64`.

## Browser and rollout limits

- Headless Chrome rendered the sign-in page and its sign-in controls. Authenticated local testing subsequently covered sign-in/session handling, report generation/download, and assessment-form updates.
- After restarting the local dev server with the loader-supported PostCSS config, the sign-in page contained generated Tailwind selectors (`.grid`, `.min-h-screen`, and `.rounded-xl`) and rendered with styling.
- The final Jest run passed: 1 suite and 5 tests.
- The image was built and exercised locally. The migration was subsequently merged as commit `48900b0` in PR #8 and, per the rollout record, pushed and deployed to the testing environment.
