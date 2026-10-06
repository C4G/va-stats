## 1. Add the shared shadcn toast infrastructure

- [x] 1.1 Add minimal shadcn configuration for the existing Tailwind 3 setup and `@/*` alias, add `@base-ui/react`, and create the local shadcn Base UI Toast component; verify the dependency and component resolve with `pnpm type-check` and confirm Tailwind preflight remains disabled.
- [x] 1.2 Implement the shared notification API and ordered queue with unique ids, severity types, low priority for routine messages, high priority for errors, and a five-second timeout; verify repeated identical and rapid notices appear in emission order without being overwritten.
- [x] 1.3 Mount one Toast provider and viewport around pages in `pages/_app.tsx`, including keyboard-operable dismissal and timeout pause on hover/focus; verify the same viewport remains available while navigating between pages.

## 2. Migrate existing notifications

- [x] 2.1 Migrate local snackbar state and `GlobalSnackbar` usage in configuration, users, courses, and remarks components to the shared API; verify these files contain no old snackbar imports or rendered instances.
- [x] 2.2 Migrate local snackbar state and `GlobalSnackbar` usage in students, student registration, and bulk registration to the shared API; verify each operation outcome still produces a toast with its intended severity.
- [x] 2.3 Migrate local snackbar state and `GlobalSnackbar` usage in batches and batch details to the shared API; verify operation notices use the shared viewport while confirmation dialogs and inline field errors remain in place.
- [x] 2.4 Replace transient browser alerts in reports, batch creation, and batch details with shared notifications, and refactor `generateBatchStatusReport` to return or throw outcomes for its UI callers; verify report generation no longer invokes `window.alert` and callers show success or failure through the shared API.
- [x] 2.5 Remove the MUI-backed `GlobalSnackbar` component once all callers are migrated; verify `rg` finds no remaining imports or JSX usages.

## 3. Verify accessible behavior

- [x] 3.1 Review success, info, warning, and error messages with keyboard navigation and a screen reader; verify polite versus urgent announcement priority, full message text, repeated identical messages, rapid notices, dismissal, and timeout pause while focused or hovered. Browser accessibility-tree and keyboard checks passed; spoken output was not verified because no screen reader was available.
- [x] 3.2 Run `pnpm type-check` and `pnpm lint`; verify both complete without errors after all notification call sites are migrated.
