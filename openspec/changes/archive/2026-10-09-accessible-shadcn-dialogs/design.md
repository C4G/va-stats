## Context

See `proposal.md` for motivation and `specs/accessible-dialogs/spec.md` for behavior requirements. The app uses the Next.js Pages Router, has one app-level `NotificationProvider` in `pages/_app.tsx`, and already has shadcn configured for Base UI with `@base-ui/react`. Dialog surfaces currently include MUI dialogs in the shared confirmation and remarks components, a hand-built registration result dialog, and native `confirm()` calls from navigation, registration, and AG Grid handlers. Tailwind preflight is disabled and MUI remains in use elsewhere.

## Goals / Non-Goals

**Goals:**

- Reuse the installed Base UI primitives and existing shadcn/Tailwind setup.
- Keep ordinary task/result dialogs distinct from dialogs that require a decision.
- Preserve operation results while adding reliable title, description, keyboard, and focus behavior.
- Keep nested confirmation dialogs operable from remarks dialogs.

**Non-Goals:**

- Replace MUI controls, AG Grid, inline validation, or the existing toast notification system outside dialog shells and their action controls.
- Change validation, record update, deletion, or navigation rules.

## Decisions

### Use shadcn Base UI Dialog and AlertDialog for distinct interaction types

Add local `components/ui/dialog.tsx` and `components/ui/alert-dialog.tsx` components using the Base UI shadcn APIs. Use Dialog for the remarks task dialogs and registration result summary. Use AlertDialog for the shared confirmation component, nested delete confirmations, and application prompts that currently call `window.confirm` or `confirm`. Both types need a visible, meaningful title and associated context; decision prompts also need separate, explicit cancel and action controls.

Base UI is already installed and is the primitive behind the project's Toast. Its Dialog provides modal focus management and title/description parts, while AlertDialog is intended for prompts that require a response. The [shadcn Dialog documentation](https://ui.shadcn.com/docs/components/base/dialog), [Base UI Dialog documentation](https://base-ui.com/react/components/dialog), and [Base UI Alert Dialog documentation](https://base-ui.com/react/components/alert-dialog) describe these APIs and behavior.

Keep styling local to the dialog components and use the project's existing Tailwind setup. Do not enable preflight or add a broad CSS reset. Migrate the dialog action controls to shadcn-styled buttons, while retaining existing MUI text fields, layout components, and AG Grid content where they remain inside the dialog.

**Alternative considered:** Keep MUI Dialog and wrap it with better ARIA attributes. That would leave two dialog systems and would not complete the requested shadcn conversion.

### Keep the shared confirmation component and make confirmations task-specific

Replace the MUI implementation in `components/ConfirmationModal.tsx` with the AlertDialog primitive while preserving its controlled `open`, close, and confirm contract where practical. Extend the API as needed for an explicit affirmative label and supporting description. Update its callers to name the action being taken instead of relying on a generic “Confirm” button. Place initial focus and Escape on the data-preserving option for destructive, irreversible, or data-loss decisions. For the existing unsaved-change prompts, keep the current Yes/No outcomes but label the choices “Keep editing” and “Leave without saving”; focus and Escape select “Keep editing.”

Continue to render nested confirmation dialogs from within their parent remarks dialogs. Base UI supports nested dialogs, which keeps the parent available as context and lets the nested dialog return focus to the related control.

**Alternative considered:** Route every confirmation through a single global dialog. That would make confirmations nested inside a remarks modal harder to manage and would not preserve the parent dialog as the focus restoration target.

### Replace native synchronous prompts with an app-level asynchronous confirmation service

Add a `ConfirmationProvider` and `useConfirm` API alongside the app-level notification provider in `pages/_app.tsx`. `confirm(message, options)` will present one AlertDialog at a time and resolve a promise with the operator's affirmative or cancel choice. Queue concurrent requests in emission order. Allow callers to choose the safest initial-focus and Escape outcomes when they differ from a button choice. Migrate the navigation, registration, and batch/AG Grid call sites to await the result before navigating, saving, or reverting edited state.

The service will retain the active element when a request is made and restore focus to it when it remains available. When an edit removes or replaces that element, the caller must provide or identify a logical focus target in the affected workflow. Keep each caller's existing accept/cancel result, including AG Grid rollback on cancel.

**Alternative considered:** Render a separate local AlertDialog for each browser prompt. There are several prompts across the same complex batch page, including grid callbacks; a shared request queue keeps the operator in one predictable decision flow and avoids multiple competing dialogs.

### Migrate dialog shells while preserving domain content

Convert the two remarks dialog shells to Dialog, giving each a student-specific title and a short description of its purpose. Keep their existing MUI inputs, tables, and AG Grid content inside the dialog. Convert the custom registration success overlay to Dialog and expose the result heading, summary, download action, and completion/navigation action in the dialog's reading order. Remove the old registration modal CSS once unused.

**Alternative considered:** Replace all MUI and CSS-module content in the affected files. That would expand the work into unrelated form and grid styling and is not required to make the modal interactions shadcn-based.

## Risks / Trade-offs

- [Replacing synchronous `confirm()` with promises changes the timing of grid and navigation handlers] → Await each decision before side effects, serialize concurrent requests, and verify both acceptance and cancellation paths including grid rollback.
- [Nested dialogs can restore focus to the wrong layer] → Keep nested confirmations in the parent React tree and verify cancel and confirm focus behavior from remarks dialogs.
- [Screen-reader output varies by browser and assistive technology] → Verify dialog name, description, content order, action names, keyboard operation, and focus restoration with a screen reader in addition to DOM-level checks.
- [Dialog styles may conflict with existing MUI and global CSS] → Scope styling to local shadcn components, preserve disabled preflight, and review the remarks and registration layouts after migration.

## Migration Plan

1. Add and review the shadcn Base UI Dialog and AlertDialog primitives, including accessible titles, descriptions, action controls, focus-visible styles, and modal layering.
2. Migrate `ConfirmationModal` and its callers; preserve specific confirm/cancel behavior and add task-specific affirmative labels.
3. Add the app-level confirmation service and migrate all application `confirm()` calls, including async grid edit and rollback flows.
4. Migrate the remarks dialogs and registration result modal, then remove unused modal-specific CSS and MUI Dialog imports.
5. Run keyboard and screen-reader checks for ordinary, destructive, nested, registration-result, and grid-confirmation dialogs. Run the project's type check and lint after the implementation.

Rollback can restore the previous MUI/custom dialog shells and browser prompts; there is no data migration.
