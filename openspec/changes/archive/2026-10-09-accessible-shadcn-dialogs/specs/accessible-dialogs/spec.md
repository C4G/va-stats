## Purpose

Provides predictable modal tasks and decision prompts that blind operators can understand and operate with a screen reader and keyboard, while preserving the result of each workflow.

## ADDED Requirements

### Requirement: Dialogs expose meaningful names, descriptions, and content

Every application modal or confirmation prompt MUST be exposed to assistive technology as a modal dialog with a visible, task-specific title that provides its accessible name. Explanatory text needed to understand the task or consequence MUST be programmatically associated with the dialog. The dialog's remaining content MUST stay available in a logical reading order, and each action control MUST have an accessible name that describes its action.

#### Scenario: Operator opens a contextual confirmation

- **WHEN** an operator requests confirmation for an attendance or record change
- **THEN** a screen reader announces the dialog role, a title identifying the action, the relevant record or change details, and the available actions

#### Scenario: Operator reviews a result dialog

- **WHEN** a registration result dialog opens with a summary and follow-up actions
- **THEN** a screen reader can navigate the result summary and identify each action without relying on visual layout or icon meaning

### Requirement: Dialogs support keyboard and focus access

When a modal opens, keyboard focus MUST move into it and remain within the active modal while it is open. Content outside the active modal MUST be unavailable for interaction. Dismissible dialogs MUST provide a keyboard-operable close action. On dismissal, focus MUST return to the control that opened the dialog, or move to a logical control in the affected workflow when the original control no longer exists or the workflow navigates.

#### Scenario: Operator navigates a dialog with a keyboard

- **WHEN** an operator opens a modal and presses Tab or Shift+Tab
- **THEN** focus moves among the dialog's available controls without moving into the page behind it

#### Scenario: Operator dismisses a dialog

- **WHEN** an operator closes a dismissible dialog with its close control or presses Escape
- **THEN** the dialog closes and focus returns to the invoking control or the workflow's logical next control

### Requirement: Confirmation decisions are explicit and safe to operate

An action that requires confirmation MUST remain pending until the operator chooses an affirmative action or cancels. The affirmative control MUST describe the action it performs, and a distinct, keyboard-operable cancel action MUST be available. For destructive, irreversible, or data-loss actions, initial focus MUST be placed on the option that preserves existing data. Pressing Escape MUST have the same data-preserving outcome; it MUST NOT trigger a destructive or data-loss result. Confirmation requests from application workflows MUST use the application's accessible dialog interaction rather than browser-native confirmation UI.

#### Scenario: Operator cancels a destructive change

- **WHEN** an operator opens a destructive confirmation
- **THEN** focus is on the data-preserving option, and choosing it or pressing Escape leaves the data unchanged

#### Scenario: Operator encounters an unsaved-change prompt

- **WHEN** an operator tries to leave a view with unsaved changes
- **THEN** focus starts on the option to keep editing, Escape keeps the operator on that view, and the explicit leave action clearly says it discards unsaved changes

#### Scenario: Operator confirms a data change

- **WHEN** an operator activates the explicitly named affirmative action
- **THEN** the requested operation proceeds once and its existing success, error, and navigation outcomes are preserved

#### Scenario: A workflow requests confirmation

- **WHEN** navigation, form submission, or a grid edit requires an operator decision
- **THEN** the application presents its accessible confirmation dialog and applies the existing accept or cancel behavior to that workflow

### Requirement: Nested confirmations preserve dialog context

When a confirmation is opened from within another modal, the confirmation MUST be announced and operated as the active dialog while the parent remains available as background context. Closing the confirmation without leaving the parent modal MUST return focus to the relevant control in the parent.

#### Scenario: Operator cancels deletion from a remarks dialog

- **WHEN** an operator opens a delete confirmation from a remarks modal and cancels it
- **THEN** the remarks modal remains open and focus returns to the delete action that opened the confirmation

#### Scenario: Operator completes a nested confirmation

- **WHEN** an operator confirms an action from a nested confirmation and the parent workflow remains open
- **THEN** the action completes and focus returns to the appropriate control in the parent modal
