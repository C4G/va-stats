# JavaScript migration baseline

Captured 2026-09-15 before implementation. The inventory covered authored JavaScript/JSX while excluding `.next/`, `node_modules/`, the Next.js 14-required `next.config.js`, generated PWA files (`public/sw.js`, `public/workbox-*.js`), and static DreamHost deliverables.

The migration candidate set contained 96 `.js` files and 44 `.jsx` files across `pages/`, `components/`, `lib/`, `utils/`, and supported tool configuration. The source tree therefore contained 140 application/test/configuration files to convert, plus the one required Next.js configuration exception.

Conversion scope:

- `pages/`: Pages Router pages, dynamic pages, framework entry points, and API handlers.
- `components/`: shared UI, AG Grid, batch, student, and remarks components.
- `lib/` and `utils/`: database/auth helpers, domain utilities, report/CSV helpers, and tests.
- Tooling: Jest setup/configuration, Tailwind configuration, and PostCSS configuration.

Final audit exclusions:

- `next.config.js`: required by the installed Next.js 14 loader, retained as the sole authored JavaScript toolchain exception.
- `public/sw.js` and `public/workbox-*.js`: generated PWA output.
- `.next/` and `node_modules/`: generated/build and third-party files.
- `dreamhost-mtl/`: static HTML deliverables.
