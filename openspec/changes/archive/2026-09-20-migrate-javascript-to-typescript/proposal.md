## Why

The application is already partially TypeScript-enabled, but its main pages, API routes, React components, libraries, utilities, tests, and configuration still rely on JavaScript. This leaves the type checker unable to provide consistent coverage and makes shared data contracts harder to maintain. Completing the migration now establishes one statically typed source language without changing the application's existing behavior or external API contracts.

## What Changes

- Rename authored application `.js` files to `.ts` and authored React `.jsx` files to `.tsx` across `pages`, `components`, `lib`, `utils`, and tests.
- Add explicit TypeScript types for page props, React component props/state, API request and response data, database results, utility inputs/outputs, event handlers, and shared domain objects, reusing and extending the existing types where appropriate.
- Convert JavaScript-based project configuration and test setup files that are part of the authored application toolchain to TypeScript-compatible configuration, while preserving Next.js, Jest, lint, formatting, and build behavior.
- Update imports, route references, Jest coverage globs, Next.js page extensions, and documentation to reflect the new file names.
- Remove transitional JavaScript support from the compiler configuration after migration (`allowJs` and obsolete JavaScript project configuration), so newly introduced authored JavaScript cannot bypass type checking.
- Keep the Next.js 14-required `next.config.js` and the loader-required `postcss.config.js`, generated build/PWA artifacts, and external/static DreamHost files out of the migration; these are toolchain-required or generated/non-application assets rather than authored application modules.
- Preserve runtime behavior, routes, response shapes, authentication behavior, database interactions, and deployment configuration.

## Capabilities

### New Capabilities

None. This change is a source-language and tooling migration with no new user-visible capability.

### Modified Capabilities

None. Existing runtime requirements are intentionally unchanged.

## Impact

- Affects 140 authored JavaScript/JSX source, test, and supported configuration modules in the Next.js Pages Router application, plus the existing TypeScript modules they interoperate with; `next.config.js` and `postcss.config.js` remain documented toolchain exceptions.
- Affects compiler and framework configuration (`tsconfig`, removal of obsolete `jsconfig`, Next.js page extensions, Jest setup/configuration, and related package scripts or type dependencies). Next.js 14's required `next.config.js` and the PostCSS loader's required `postcss.config.js` remain documented toolchain exceptions.
- Requires staged conversion to keep imports and the application build working while pages, API routes, components, server libraries, utilities, tests, and configuration are migrated.
- Requires validation with type checking, linting, formatting, unit tests, production build, and targeted API/page smoke checks; no database schema or public HTTP contract changes are intended.
- Adds an ESLint guardrail rejecting explicit TypeScript type assertions in authored .ts/.tsx code, including as any, so type errors must be resolved through declarations, generics, unions, or control-flow narrowing.
