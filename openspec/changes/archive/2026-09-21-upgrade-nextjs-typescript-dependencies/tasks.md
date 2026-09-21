## 1. Establish Baseline

- [x] 1.1 Record current dependency versions and run `pnpm install --frozen-lockfile`, `pnpm format`, `pnpm lint`, `pnpm type-check`, `pnpm test`, and `pnpm build`, documenting any pre-existing failures.
- [x] 1.2 Inspect CI and Docker build commands and verify the current standalone image starts with the existing deployment configuration.

## 2. Resolve and Apply Dependency Upgrade

- [x] 2.1 Query current stable Next.js, React, TypeScript, ESLint, type-package, and coupled-package releases plus their official migration guidance, and record the selected compatibility set.
- [x] 2.2 Update `package.json` for Next.js, React/React DOM, TypeScript, framework linting, React types, compiler helpers, and any required coupled dependencies; verify peer dependencies resolve without unsupported overrides.
- [x] 2.3 Validate `next-pwa` against the selected Next.js release and either retain it or replace it with a compatible maintained integration; verify the existing PWA/service-worker output contract.
- [x] 2.4 Regenerate `pnpm-lock.yaml` with pnpm 11 and verify a clean frozen install succeeds.

## 3. Migrate Source and Configuration

- [x] 3.1 Apply only the source, TypeScript, Next.js config, lint, or test changes required by migration diagnostics; verify the Pages Router, API routes, Prisma generation, and standalone output remain configured.
- [x] 3.2 Resolve all TypeScript and lint diagnostics without weakening compiler safety; verify `pnpm type-check` and `pnpm lint` pass.
- [x] 3.3 Verify formatting and authored-JavaScript checks pass with `pnpm format` and `pnpm check:javascript`.

## 4. Validate Runtime and Delivery

- [x] 4.1 Run the full automated suite with `pnpm test` and `pnpm test:coverage`; verify no regression is introduced by the dependency migration.
- [x] 4.2 Run `pnpm build` and verify Next.js production compilation, Prisma generation, PWA assets, and standalone output complete successfully.
- [x] 4.3 Run the repository’s CI/container build path and verify the resulting application starts and serves representative pages and API health/authentication flows.
- [x] 4.4 Review the final manifest, lockfile, and source diff for unrelated upgrades; document selected versions, migration notes, validation results, and any remaining follow-up before marking the proposal complete.

## Implementation Notes

- Selected versions: Next.js 16.3.5, React/React DOM 19.3.0, TypeScript 6.0.3, ESLint 9.39.5, `eslint-config-next` 16.3.5, React 19 type packages 19.3.0, AG Grid 36.2.0, React Hook Form 7.88.0, React Native Web 0.21.2, Better Auth 1.7.5, and Sharp 0.35.4.
- Next.js 16 requires the direct `eslint .` script and `--webpack` build flag because `next lint` was removed and `next-pwa` supplies a webpack configuration. `experimental.useTypeScriptCli: false` keeps Next on its compatible TypeScript API path.
- AG Grid’s tab-navigation callback now returns `false` instead of `null`; the bulk-registration page is server-rendered on demand and loads AG Grid client-side to preserve production prerendering compatibility.
- Validation passed: frozen pnpm install, peer dependency check, type-check, lint with warnings only, formatting, authored-JavaScript check, unit tests (7/7), coverage command, production build, standalone Docker build, Prisma migration startup, and `/api/health` smoke test.
- Remaining non-blocking warnings: existing `<img>` lint warning, unused eslint-disable warnings, stale Browserslist data, and an Autoprefixer warning in AG Grid CSS.
