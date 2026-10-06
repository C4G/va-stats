## Why

The app reports operation outcomes through a mix of page-local MUI snackbars and blocking browser alerts. These messages are not announced consistently by screen readers, so users may not know whether an action succeeded or failed. A shared toast pattern will make transient feedback predictable visually and programmatically.

## What Changes

- Add one app-wide toast interface and presentation surface for transient operation confirmations, updates, validation notices, and failures.
- Use shadcn/ui's Base UI Toast component for the shared toast surface.
- Migrate current page-local snackbar notifications and in-scope browser `alert()` notices to the shared toast pattern.
- Give each toast appropriate live announcement semantics so routine updates are announced politely and urgent errors assertively.
- Keep inline field validation and blocking confirmation dialogs as distinct interaction patterns.

## Capabilities

### New Capabilities

- `accessible-notifications`: Consistent, screen-reader-announced transient notifications across the application.

### Modified Capabilities

## Impact

- Affects `components/GlobalSnackbar.tsx`, notification state and calls in pages and components, browser-alert call sites in report and batch flows, and the app root in `pages/_app.tsx`.
- Adds the initial shadcn/ui component configuration, a local Toast component, and the `@base-ui/react` dependency; existing MUI use elsewhere in the app remains.
- Adds a shared client-side notification API and may change notification timing and presentation from blocking alerts to non-blocking toasts.
