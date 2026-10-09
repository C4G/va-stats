import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import ConfirmationModal from "@/components/ConfirmationModal";
import { ConfirmationProvider, useConfirm } from "@/components/notifications/ConfirmationProvider";
import { RegistrationResultDialog } from "@/components/RegistrationResultDialog";
import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogViewport,
} from "@/components/ui/dialog";

function QueueHarness() {
  const confirm = useConfirm();
  const [results, setResults] = useState<string[]>([]);

  const runQueue = () => {
    void confirm("Save the first item?", { title: "First action", confirmLabel: "Save first" }).then((result) => {
      setResults((current) => [...current, `first:${result}`]);
    });
    void confirm("Delete the second item?", {
      title: "Delete second item?",
      confirmLabel: "Delete second item",
      destructive: true,
    }).then((result) => setResults((current) => [...current, `second:${result}`]));
  };

  return (
    <>
      <button type="button" onClick={runQueue}>
        Open confirmations
      </button>
      <output aria-label="Confirmation results">{results.join(",")}</output>
    </>
  );
}

function GridFocusHarness() {
  const confirm = useConfirm();
  const gridCellRef = useRef<HTMLButtonElement>(null);
  const [result, setResult] = useState("pending");

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const saved = await confirm("Save this grade change?", {
            title: "Save grade change?",
            confirmLabel: "Save grade",
            focusTarget: (confirmed) => (confirmed ? null : gridCellRef.current),
          });
          setResult(saved ? "saved" : "cancelled");
        }}
      >
        Edit grade
      </button>
      <button ref={gridCellRef} type="button">
        Grade cell
      </button>
      <output aria-label="Grid result">{result}</output>
    </>
  );
}

function PreferredFocusTargetHarness() {
  const [open, setOpen] = useState(false);
  const batchDeleteRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open batch confirmation
      </button>
      <button ref={batchDeleteRef} type="button">
        Delete batch 123
      </button>
      <ConfirmationModal
        open={open}
        handleClose={() => setOpen(false)}
        handleConfirm={() => setOpen(false)}
        title="Delete batch 123"
        message="This batch will be deleted."
        confirmColor="error"
        confirmLabel="Delete batch"
        returnFocusTarget={() => batchDeleteRef.current}
      />
    </>
  );
}

function UnsavedChangesHarness() {
  const confirm = useConfirm();
  const [result, setResult] = useState<string>("pending");

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void confirm("Keep editing or leave without saving?", {
            title: "Unsaved changes",
            confirmLabel: "Keep editing",
            cancelLabel: "Leave without saving",
            initialFocus: "confirm",
            escapeResult: true,
          }).then((confirmed) => setResult(String(confirmed)));
        }}
      >
        Edit student
      </button>
      <output aria-label="Unsaved changes result">{result}</output>
    </>
  );
}

function NestedConfirmationHarness() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showDeleteButton, setShowDeleteButton] = useState(true);
  const parentCloseRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open>
      <DialogPortal>
        <DialogBackdrop />
        <DialogViewport>
          <DialogPopup>
            <DialogTitle>Remarks for Maya Chen</DialogTitle>
            <DialogDescription>View and manage this student&apos;s remarks.</DialogDescription>
            {showDeleteButton && (
              <button type="button" onClick={() => setConfirmOpen(true)}>
                Delete remark
              </button>
            )}
            <button ref={parentCloseRef} type="button">
              Close remarks
            </button>
            <ConfirmationModal
              open={confirmOpen}
              handleClose={() => setConfirmOpen(false)}
              handleConfirm={() => {
                setConfirmOpen(false);
                setShowDeleteButton(false);
              }}
              title="Delete remark"
              message="This action cannot be undone."
              confirmColor="error"
              confirmLabel="Delete remark"
              fallbackFocus={() => parentCloseRef.current}
            />
          </DialogPopup>
        </DialogViewport>
      </DialogPortal>
    </Dialog>
  );
}

describe("accessible confirmation dialogs", () => {
  it("queues requests and resolves each result once", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmationProvider>
        <QueueHarness />
      </ConfirmationProvider>
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "Open confirmations" })).toHaveFocus();
    await user.keyboard("{Enter}");
    const firstDialog = await screen.findByRole("alertdialog", { name: "First action" });
    expect(firstDialog).toHaveAccessibleDescription("Save the first item?");
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());

    await user.tab();
    expect(screen.getByRole("button", { name: "Save first" })).toHaveFocus();
    await user.keyboard("{Enter}");
    const secondDialog = await screen.findByRole("alertdialog", { name: "Delete second item?" });
    expect(secondDialog).toHaveAccessibleDescription("Delete the second item?");
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.getByLabelText("Confirmation results")).toHaveTextContent("first:true,second:false")
    );
    expect(screen.getByRole("button", { name: "Open confirmations" })).toHaveFocus();
  });

  it("focuses the safe unsaved-change choice and keeps it on Escape", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmationProvider>
        <UnsavedChangesHarness />
      </ConfirmationProvider>
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "Edit student" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("alertdialog", { name: "Unsaved changes" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus());
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.getByLabelText("Unsaved changes result")).toHaveTextContent("true"));
    expect(screen.getByRole("button", { name: "Edit student" })).toHaveFocus();
  });

  it("returns cancelled grid edits to the provided grid control", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmationProvider>
        <GridFocusHarness />
      </ConfirmationProvider>
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "Edit grade" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("alertdialog", { name: "Save grade change?" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
    await user.keyboard("{Enter}");

    await waitFor(() => expect(screen.getByLabelText("Grid result")).toHaveTextContent("cancelled"));
    expect(screen.getByRole("button", { name: "Grade cell" })).toHaveFocus();
  });

  it("prefers a current return target when a grid replaces the original opener", async () => {
    const user = userEvent.setup();
    render(<PreferredFocusTargetHarness />);

    await user.tab();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("alertdialog", { name: "Delete batch 123" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.getByRole("button", { name: "Delete batch 123" })).toHaveFocus());
  });

  it("returns focus to the delete control when a nested confirmation is cancelled", async () => {
    const user = userEvent.setup();
    render(<NestedConfirmationHarness />);

    const deleteButton = screen.getByRole("button", { name: "Delete remark" });
    await waitFor(() => expect(deleteButton).toHaveFocus());
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("alertdialog", { name: "Delete remark" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());

    await user.keyboard("{Enter}");
    await waitFor(() => expect(screen.queryByRole("alertdialog", { name: "Delete remark" })).not.toBeInTheDocument());
    expect(screen.getByRole("dialog", { name: "Remarks for Maya Chen" })).toBeInTheDocument();
    expect(deleteButton).toHaveFocus();
  });

  it("returns focus to a parent control when confirming removes the trigger", async () => {
    const user = userEvent.setup();
    render(<NestedConfirmationHarness />);

    const deleteButton = screen.getByRole("button", { name: "Delete remark" });
    await waitFor(() => expect(deleteButton).toHaveFocus());
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("alertdialog", { name: "Delete remark" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
    await user.tab();
    expect(screen.getByRole("button", { name: "Delete remark" })).toHaveFocus();
    await user.keyboard("{Enter}");

    await waitFor(() => expect(screen.queryByRole("alertdialog", { name: "Delete remark" })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Close remarks" })).toHaveFocus();
  });

  it("exposes the registration summary before named actions in keyboard order", async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn();
    const onComplete = vi.fn();
    render(
      <RegistrationResultDialog
        open
        title="Student registration completed"
        summaryData={{ name: "Maya Chen", course: "Python" }}
        labelMap={{ name: "Name", course: "Course" }}
        onDownload={onDownload}
        onComplete={onComplete}
      />
    );

    expect(await screen.findByRole("dialog", { name: "Student registration completed" })).toHaveAccessibleDescription(
      "Registration summary. Review the submitted details below or download a CSV copy."
    );
    expect(screen.getByText("Name:").parentElement).toHaveTextContent("Maya Chen");
    expect(screen.getByText("Course:").parentElement).toHaveTextContent("Python");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Student registration completed" })).toHaveFocus());

    await user.tab();
    expect(screen.getByRole("button", { name: "Download registration details" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onDownload).toHaveBeenCalledOnce();
    await user.tab();
    expect(screen.getByRole("button", { name: "Close registration summary" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Finish registration" })).toHaveFocus();
    await user.tab();
    await waitFor(() => expect(screen.getByRole("button", { name: "Download registration details" })).toHaveFocus());
    await user.tab({ shift: true });
    await waitFor(() => expect(screen.getByRole("button", { name: "Finish registration" })).toHaveFocus());
    await user.keyboard("{Enter}");
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
