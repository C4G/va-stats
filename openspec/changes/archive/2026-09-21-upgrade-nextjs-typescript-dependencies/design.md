## Context

The project is a Node 24, pnpm 11 application using the Next.js Pages Router. The current manifest uses Next.js `^14.2.33`, React 18.2, TypeScript 5.9.2, `eslint-config-next` 14.2.13, `next-pwa` 5.6.0, Prisma 7.10.0, and a mixed set of pinned and caret-ranged dependencies. `next.config.js` wraps the configuration with `next-pwa`, emits a standalone build, and serves both pages and API routes. See `proposal.md` for the motivation and scope.

## Goals / Non-Goals

**Goals:**

- Establish a reproducible, current dependency graph compatible with Node 24 and pnpm 11.
- Upgrade the framework, React runtime/types, TypeScript compiler, lint integration, and any transitive or directly coupled packages needed for a clean install and build.
- Preserve the Pages Router, authentication behavior, Prisma generation, PWA output, standalone Docker image, and existing deployment workflow.
- Detect and document migration fixes through type checking, linting, tests, production build, and container-level validation.

**Non-Goals:**

- Migrating from the Pages Router to the App Router.
- Introducing new user-facing features, changing routes/API contracts, or redesigning authentication.
- Broadly modernizing unrelated libraries solely because newer versions exist when they are not required for compatibility or security.

## Decisions

- **Resolve versions at implementation time from authoritative package metadata and migration guides.** “Latest” is time-sensitive, so implementation should query the current stable releases, then record exact resolved versions in `package.json` and `pnpm-lock.yaml`. This is preferred over hard-coding versions in the proposal. Alternatives considered: choosing today’s versions now (stales quickly) or upgrading only to the next major (does not satisfy the requested latest baseline).

- **Upgrade the framework as a coordinated React/tooling set.** Next.js, React, React DOM, `eslint-config-next`, `@types/react`, `@types/react-dom`, TypeScript, and related compiler helpers should be selected as one compatibility set. Alternatives considered: updating Next.js alone (likely leaves peer/type conflicts) or updating every dependency indiscriminately (increases unrelated regression risk).

- **Treat `next-pwa` as a compatibility decision point.** First test the existing wrapper against the selected Next.js release. If it is incompatible or unmaintained for that release, replace it with a maintained compatible PWA integration or make the smallest equivalent configuration change while preserving the generated public assets and service-worker behavior. Alternatives considered: silently removing PWA support (regression) or forcing unsupported peer dependencies (fragile build).

- **Keep the Pages Router and deployment shape.** Do not use this upgrade to migrate routing or change Docker/standalone semantics. This limits the migration surface and makes rollback to the prior lockfile/image straightforward.

- **Use lockfile-first verification.** Regenerate the pnpm lockfile after manifest changes, run the repository checks, and test a clean install/build path so dependency resolution is validated independently of a developer’s existing `node_modules`.

## Risks / Trade-offs

- [Next.js major-version breaking changes] → Apply only documented compatibility fixes, then run type checking, tests, production build, and targeted smoke checks for pages/API routes.
- [PWA plugin incompatibility] → Validate `next-pwa` early; select a maintained compatible integration or preserve equivalent service-worker behavior before considering the upgrade complete.
- [React 19/type changes expose latent issues] → Use compiler diagnostics and focused component/test fixes; avoid weakening TypeScript checks to hide migration errors.
- [Updated ESLint integration changes lint output or scripts] → Align `eslint-config-next` with the selected Next.js version and preserve a working repository check, documenting any unavoidable script/config change.
- [Transitive package upgrades change runtime behavior] → Limit upgrades to compatible/security-relevant packages, inspect the lockfile diff, and use the existing test/build/deployment checks as regression gates.

## Migration Plan

1. Capture the current baseline with dependency metadata, formatting, lint, type-check, tests, production build, and the CI/container build commands.
2. Resolve and apply the current compatible Next.js/React/TypeScript/tooling versions, then regenerate the pnpm lockfile.
3. Address documented migration diagnostics and validate PWA, standalone output, Prisma generation, and API/page compilation.
4. Run clean-install, full validation, and Docker/CI checks; inspect the dependency and lockfile diff.
5. Roll back by reverting the manifest, lockfile, and any migration-only source/config changes if validation fails or a required behavior cannot be preserved.
