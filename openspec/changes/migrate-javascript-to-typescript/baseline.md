# Migration baseline

Captured before implementation on 2026-09-15.

- `pnpm type-check`: passed.
- `pnpm exec jest --runInBand`: passed; 1 suite and 5 tests.
- `pnpm lint`: passed with existing warnings in `pages/default.jsx` and `components/Navbar.jsx`.
- `pnpm format`: failed because the pre-existing unformatted files are in `.agents/skills/**/SKILL.md` and `openspec/config.yaml`.
- `pnpm build`: passed; Next.js generated the existing page/API route set. Existing warnings include the lint warnings, an outdated Browserslist database, and an unavailable Google Fonts stylesheet during optimization.

The source inventory is recorded in `migration-inventory.md`. Generated `.next` output, generated PWA service-worker files, third-party dependencies, and static DreamHost deliverables are excluded from the authored JavaScript count.

Rollback reference: the pre-migration commit was `b991badfb682140f76d2c6c8301e642cbd91e178`; this change has no database or external API migration.
