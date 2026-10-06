# accessible-notifications Specification

## Purpose

Provides a consistent way for the application to show and announce transient operation feedback, so sighted users and screen-reader users receive the same confirmation when an action completes or needs attention.

## Requirements

### Requirement: Shared transient notification pattern

The application MUST present transient operation confirmations, updates, validation notices, and failures through one shared toast pattern. Each emitted notification MUST be visible without blocking the user from continuing to work. Existing page-specific snackbar notifications and browser alert notices in this scope MUST use this pattern.

#### Scenario: Operation completes successfully

- **WHEN** an application action completes and produces a confirmation or update
- **THEN** the application presents its message through the shared toast pattern without opening a blocking browser dialog

#### Scenario: Operation fails or needs correction

- **WHEN** an application action fails or its input needs correction and produces a transient notice
- **THEN** the application presents the message through the same shared toast pattern with an appropriate severity

#### Scenario: Multiple notices are produced close together

- **WHEN** more than one notification is emitted before the prior notification has been presented
- **THEN** each notification is presented and announced in emission order without silently discarding an outcome

### Requirement: Screen-reader announcement of notifications

Every notification MUST be exposed through an accessible live announcement and MUST be announced when it appears. Success, informational, and warning notifications MUST use polite announcement behavior; error notifications MUST use assertive announcement behavior. The announcement MUST include the notification's text and MUST NOT rely on color or icon alone to communicate its meaning.

#### Scenario: Routine update is announced

- **WHEN** a success, informational, or warning notification appears
- **THEN** a screen reader is given its text through a polite live announcement

#### Scenario: Error is announced

- **WHEN** an error notification appears
- **THEN** a screen reader is given its text through an assertive live announcement

#### Scenario: Identical notice is emitted again

- **WHEN** a notification with the same text and severity is emitted again after it was previously shown
- **THEN** the new occurrence is announced again

### Requirement: Notification controls are accessible

The toast pattern MUST allow users to dismiss a visible notification using an accessible, keyboard-operable control. Automatically dismissed notifications MUST remain available long enough to be perceived, and dismissal MUST NOT be required for the live announcement to occur.

#### Scenario: Keyboard user dismisses a toast

- **WHEN** a keyboard user reaches and activates the toast's dismiss control
- **THEN** the visible toast is dismissed and the control has an accessible name

#### Scenario: Toast expires automatically

- **WHEN** a notification is configured to dismiss automatically
- **THEN** its text is announced when shown and it remains visible for at least 5 seconds before automatic dismissal

#### Scenario: User is interacting with a toast

- **WHEN** the pointer is over a visible toast or keyboard focus is within it
- **THEN** its automatic dismissal timer is paused until the pointer and focus leave the toast

### Requirement: Distinct validation and confirmation interactions remain distinct

Inline field validation and dialogs that request confirmation before an action MUST remain available in their existing interaction patterns; they MUST NOT be converted into transient toasts solely as part of this notification change.

#### Scenario: Inline field error is shown

- **WHEN** a form field has a validation error
- **THEN** the error remains associated with the relevant field as inline feedback

#### Scenario: User must approve a consequential action

- **WHEN** an action requires explicit user approval before it proceeds
- **THEN** the application presents a confirmation interaction that requires a user decision rather than a transient toast
