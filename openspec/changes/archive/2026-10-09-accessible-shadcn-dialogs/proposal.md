## Why

Modal and confirmation interactions are currently split across MUI dialogs, a custom registration dialog, and browser `confirm()` prompts. Converting them to shadcn dialogs will make these focused interactions consistent and ensure blind operators can identify each dialog, understand its purpose, move through its controls, and make a decision with a screen reader and keyboard.

## What Changes

- Add shadcn Base UI Dialog and AlertDialog components using the existing shadcn configuration and Base UI dependency.
- Migrate application modals and confirmation dialogs, including the shared confirmation component, remarks dialogs, registration success summary, and native browser confirmation prompts.
- Give each dialog a meaningful accessible name, relevant description, clearly named actions, and predictable keyboard and focus behavior.
- Preserve each interaction's decision, cancellation, submission, and navigation outcomes while replacing its presentation.

## Capabilities

### New Capabilities

- `accessible-dialogs`: Consistent, screen-reader-accessible modal tasks and decision prompts.

### Modified Capabilities

## Impact

- Affects `components/ConfirmationModal.tsx`, `components/TelecallerRemarksModal.tsx`, `components/batches/RemarksModal.tsx`, `pages/studentregistration.tsx`, `pages/batch/[id].tsx`, `pages/bulkstudentregistration.tsx`, `components/NavItem.tsx`, and pages that use the shared confirmation modal (`students`, `users`, `courses`, `batches`, and `configurations`).
- Adds local shadcn Base UI Dialog and AlertDialog components under `components/ui/`; reuses the existing `components.json`, `@base-ui/react`, and Tailwind setup.
- Replaces native browser confirmation UI with application-controlled confirmation interactions while keeping inline validation and transient notifications in their current patterns.
