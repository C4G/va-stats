## 1. Add shadcn dialog primitives

- [x] 1.1 Add local Base UI shadcn Dialog and AlertDialog components with consistent, keyboard-visible action button styles; verify titles, descriptions, focus styling, and layering work with the existing Tailwind setup while preflight remains disabled.

## 2. Migrate shared and nested confirmations

- [x] 2.1 Replace the MUI-based `ConfirmationModal` surface with AlertDialog, add an explicit affirmative action label where needed, and focus Cancel first for destructive or data-loss actions; verify each caller exposes task-specific title, description, and action names.
- [x] 2.2 Convert the delete confirmations nested in both remarks dialogs; verify cancel returns focus to the delete action and leaves the parent remarks dialog available.

## 3. Replace browser confirmation prompts

- [x] 3.1 Add an app-level `ConfirmationProvider` and `useConfirm` service with promise results and an ordered request queue; verify only one prompt is active at a time and each request resolves once with the chosen result.
- [x] 3.2 Migrate prompts in navigation and student-registration flows, including bulk registration and form reset; verify accept and cancel preserve the current navigation, submission, and reset outcomes.
- [x] 3.3 Migrate all prompts in the batch page, including attendance, grades, status, and document grid edits; verify accepted edits save once and cancelled edits restore the prior value and focus to a logical grid control.
- [x] 3.4 Search application source for remaining `window.confirm()` or global `confirm()` calls; verify all in-scope prompts use the app-level accessible confirmation service.

## 4. Migrate task and result dialogs

- [x] 4.1 Replace the MUI shells in `TelecallerRemarksModal` and `RemarksModal` with Dialog while retaining their existing form and grid content; verify each has a student-specific title, a useful description, and working close and submit actions.
- [x] 4.2 Replace the custom registration success overlay with Dialog and remove its modal-only CSS; verify its accessible name and description, summary reading order, named actions, and keyboard navigation.
- [x] 4.3 Remove obsolete MUI Dialog imports and styles from migrated files; verify MUI remains available for unrelated application components.

## 5. Verify accessible behavior

- [x] 5.1 Operate ordinary, destructive, nested, result, and grid confirmation dialogs using keyboard only; verify focus enters and stays in the active dialog, Cancel and Escape never commit, and dismissal restores focus appropriately.
- [x] 5.2 Review those dialog types with a supported screen reader/browser pairing; verify the dialog role, title, contextual description, content order, and action names are announced and usable.
  - Windows NVDA review confirmed announcements across ordinary, destructive, nested, result, and grid confirmation dialogs.
- [x] 5.3 Run `pnpm type-check` and `pnpm lint`; verify both finish without errors after the migrations.
