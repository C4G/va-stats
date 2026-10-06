## Context

See `proposal.md` for motivation and `specs/accessible-notifications/spec.md` for behavior requirements. The app uses Next.js Pages Router, React 19, and Tailwind CSS 3.4. It has no shadcn/ui configuration or Base UI dependency today. `components/GlobalSnackbar.tsx` wraps MUI `Snackbar` and `Alert`, while individual pages and components own notification state. `pages/_app.tsx` is the shared app root. Browser alerts also appear in report and batch workflows, including `utils/generate-batch-status-report.ts`.

The existing Tailwind setup disables preflight, and `tsconfig.json` already defines the `@/*` import alias. Notification call sites include reports, batches, batch details, configuration, users, courses, students, student registration, bulk registration, and remarks components. Inline field errors and explicit `confirm()` / confirmation-modal flows have separate purposes.

## Goals / Non-Goals

**Goals:**

- Provide one app-wide shadcn Toast provider, notification API, and visible viewport for transient application notices.
- Use the Toast component's announcement priorities to announce routine messages politely and errors urgently, including repeated messages with identical text.
- Preserve severity distinctions, keyboard access and dismissal, and the five-second baseline for automatic dismissal.
- Ensure notification logic in data/report utilities returns outcomes to UI callers rather than opening browser dialogs itself.

**Non-Goals:**

- Replacing inline field validation, page-level form error associations, or dialogs that require a decision.
- Changing the wording or business rules behind existing operation messages except where needed to make an outcome clear.
- Migrating unrelated MUI components or replacing Tailwind CSS as part of this notification change.

## Decisions

### Use shadcn/ui's Base UI Toast component

Add the shadcn Toast component built on Base UI and its `@base-ui/react` dependency. Create the minimal shadcn component configuration needed for this existing Pages Router and Tailwind 3 project, reusing the `@/*` alias and preserving the disabled Tailwind preflight. Keep the generated Toast implementation local under `components/ui/` so it can follow the app's styling and accessible-name requirements.

The Toast API supplies `success`, `info`, `warning`, and `error` types for visual status and `low` / `high` announcement priorities. Map routine success, info, and warning messages to low priority, and errors to high priority. Set the provider's default timeout to five seconds, pause dismissal while the pointer is over a toast or keyboard focus is inside it, and retain keyboard-operable dismissal. Use the Toast viewport's keyboard navigation support and ensure the spoken title/description contains the full message.

The current shadcn Base UI Toast component supports an app-wide provider and toast manager, status types, announcement priorities, and a keyboard-accessible viewport. The older Radix-based shadcn Toast is deprecated; Sonner is an option for projects choosing the Radix flavor, but this project will use the current Base UI Toast component directly. See the [shadcn Toast documentation](https://ui.shadcn.com/docs/components/base/toast) and [Base UI Toast documentation](https://base-ui.com/react/components/toast).

**Alternative considered:** Continue using MUI `Snackbar` and `Alert`. They are already installed but remain part of the existing mixed notification system; choosing them would not start the app's requested shadcn adoption. Sonner was also considered, but the current shadcn Base UI Toast component provides the shared provider, status types, and announcement priority needed here.

### Mount one notification service at the Pages Router root

Wrap the page component in one shared notification provider from `pages/_app.tsx`, with one Base UI Toast provider and viewport for the app lifetime. Expose a typed `notify(message, severity)` hook or context API to pages and components. The shared adapter owns notification ids and a one-at-a-time queue so repeated messages remain distinct and rapid notices are presented in emission order without being overwritten or competing for announcement. New route content continues to use the same viewport.

Use the Toast manager from React UI callers. Refactor `generateBatchStatusReport` so it returns or throws meaningful outcomes instead of showing browser dialogs; its report and batch page callers then use the shared notification API. This keeps report generation independent from the UI and avoids module-level notification state.

**Alternative considered:** Create a module-level toast manager and call it directly from utilities. Keeping notification decisions at the UI boundary avoids coupling reusable report generation to browser presentation and keeps server-rendered requests from sharing notification state.

### Migrate notification call sites

Replace page/component-owned `GlobalSnackbar` state and direct browser `alert()` calls for transient notices with the shared API. Leave `window.confirm`, custom confirmation modals, and inline field messages untouched. Remove the MUI-backed `GlobalSnackbar` component if it has no remaining callers; leave MUI installed because other app screens still use it.

## Risks / Trade-offs

- [A burst can create a long queue] → Keep one ordered queue, use the five-second baseline, and verify notices are neither overwritten nor dropped.
- [Screen-reader behavior differs across browser and assistive-technology combinations] → Verify polite and urgent announcement priorities and perform a manual screen-reader pass for success, error, repeated, and rapid notices.
- [Introducing shadcn configuration could affect existing Tailwind styles] → Keep the setup scoped to the Toast component, preserve preflight as disabled, and avoid a broad theme or CSS reset migration.
- [Changing blocking browser alerts to non-blocking toasts lets work continue before the user reads the message] → Keep messages informational and actionable without requiring a response; keep decision prompts in confirmation dialogs.

## Migration Plan

1. Add minimal shadcn configuration, the Base UI Toast component, and the shared provider, queue, host, and notification API at `pages/_app.tsx`.
2. Migrate existing `GlobalSnackbar` call sites and their local notification state.
3. Replace in-scope browser alerts in report and batch workflows; have shared utilities return errors/outcomes to their UI callers.
4. Remove the old page-local snackbar interface after all in-scope callers use the shared API, then validate notification scenarios and screen-reader semantics.

Rollback can restore the previous `GlobalSnackbar` callers and browser alerts without data migration; the change affects client-side presentation only.
