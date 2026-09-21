## Why

The application is pinned to Next.js 14.2, React 18, TypeScript 5.9, and an older ESLint/Next integration while the current supported Next.js line is 16.x and TypeScript 6.x is available. Upgrading now reduces exposure to obsolete framework and security fixes, keeps the Node 24 toolchain aligned with current releases, and establishes a supported dependency baseline without changing intended application behavior.

## What Changes

- Upgrade Next.js to the latest stable release available when implementation begins, including its matching `eslint-config-next` and required React/React DOM major versions.
- Upgrade TypeScript and the directly coupled type packages, compiler tooling, and lint integration to compatible current releases.
- Review and update dependencies coupled to the framework/toolchain, including `next-pwa`, `@swc/helpers`, `sharp`, ESLint, testing utilities, and relevant React ecosystem packages where compatibility requires it.
- Regenerate `pnpm-lock.yaml` and preserve the repository’s pnpm and Node engine conventions.
- Adapt configuration or source code only where required by documented Next.js, React, TypeScript, or dependent-package breaking changes; preserve the existing Pages Router, standalone output, PWA behavior, authentication, API routes, and deployment contract.
- Validate formatting, linting, type checking, tests, production build, and the Docker/standalone deployment path.
- **BREAKING**: Resolve any source/configuration changes required by major-version migrations, including changed framework APIs, compiler defaults, lint behavior, or React typing/runtime expectations.

## Capabilities

### New Capabilities

None. This is a dependency and compatibility upgrade; it does not introduce user-facing behavior.

### Modified Capabilities

None. Existing application requirements remain unchanged.

## Impact

- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.js`, lint/build configuration, and any source files affected by migration diagnostics.
- Pages Router pages and API routes, React components, authentication integration, Prisma generation, PWA service-worker generation, and standalone Docker builds.
- CI and deployment workflows that install dependencies, run checks, build the image, or execute the production server.
