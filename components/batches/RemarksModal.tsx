import { Delete as DeleteIcon } from "@mui/icons-material";
import { Box, CircularProgress, IconButton, TextField, Typography } from "@mui/material";
import type { CellValueChangedEvent, ColDef, ICellRendererParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { smartComparator } from "@/utils/grid-comparators";
import ConfirmationModal from "../ConfirmationModal";
import { useNotification } from "@/components/notifications/NotificationProvider";
import {
  Dialog,
  DialogBackdrop,
  DialogButton,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogViewport,
} from "@/components/ui/dialog";

type Remark = {
  id?: string | number;
  user_name?: string;
  user_id?: string | number;
  remarks?: string;
};
type SessionUser = { id?: string | number };

const RemarksModal = ({ open, onClose, student, batchId, onDataChange }) => {
  const notify = useNotification();
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [newRemark, setNewRemark] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [remarkToDelete, setRemarkToDelete] = useState<Remark | null>(null);
  const [dataChanged, setDataChanged] = useState(false);
  const deleteActionRef = useRef<HTMLElement | null>(null);
  const parentCloseRef = useRef<HTMLButtonElement>(null);

  // Custom cell renderer for actions column
  const ActionsCellRenderer = (props: ICellRendererParams<Remark>) => {
    const row = props.data;
    if (!row || !currentUser || row.user_id !== currentUser.id) {
      return null;
    }

    const handleDeleteClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      deleteActionRef.current = event.currentTarget;
      setRemarkToDelete(row);
      setDeleteConfirmOpen(true);
    };

    return (
      <IconButton
        size="small"
        color="error"
        onClick={handleDeleteClick}
        aria-label={`Delete remark by ${row.user_name}`}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    );
  };

  // Column definitions for the AG-Grid
  const columnDefs: ColDef<Remark>[] = [
    {
      field: "user_name",
      headerName: "User",
      sortable: true,
      filter: true,
      width: 150,
      editable: false,
    },
    {
      field: "remarks",
      headerName: "Remark",
      sortable: true,
      filter: true,
      flex: 1,
      wrapText: true,
      autoHeight: true,
      editable: (params) => {
        // Only allow editing if the current user is the author of the remark
        return Boolean(currentUser && params.data && params.data.user_id === currentUser.id);
      },
      cellEditor: "agTextCellEditor",
      cellEditorParams: {
        maxLength: 1000,
        rows: 2,
        cols: 50,
      },
    },
    {
      headerName: "Actions",
      width: 100,
      cellRenderer: ActionsCellRenderer,
      sortable: false,
      filter: false,
      editable: false,
    },
  ];

  const defaultColDef = {
    resizable: true,
    editable: false,
    sortable: true,
    comparator: smartComparator,
  };

  // Fetch current user information
  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session");
      if (response.ok) {
        const session = await response.json();
        setCurrentUser(session?.user || null);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  }, []);

  // Delete remark function
  const handleDeleteRemark = async () => {
    if (!remarkToDelete?.id) return;

    // Hide confirmation modal and show loading state
    setDeleteConfirmOpen(false);
    setLoading(true);

    try {
      const response = await fetch(`/api/va-remarks/${remarkToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchRemarks(); // Refresh the remarks list
        requestAnimationFrame(() => {
          if (!deleteActionRef.current?.isConnected) parentCloseRef.current?.focus();
        });
        setRemarkToDelete(null);
        setDataChanged(true); // Mark that data has changed
        // Show success toast
        notify("Remark deleted successfully!", "success");
      } else {
        console.error("Failed to delete remark");
        notify("Failed to delete remark. Please try again.", "error");
      }
    } catch (error) {
      console.error("Error deleting remark:", error);
      notify("Failed to delete remark. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle cell value changes (for editing remarks)
  const onCellValueChanged = async (params: CellValueChangedEvent<Remark>) => {
    if (params.colDef.field !== "remarks" || !params.newValue || params.newValue === params.oldValue) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/va-remarks/${params.data.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          remarks: params.newValue.trim(),
        }),
      });

      if (response.ok) {
        setDataChanged(true); // Mark that data has changed
        // Show success message
        notify("Remark updated successfully!", "success");
      } else {
        console.error("Failed to update remark");
        notify("Failed to update remark. Please try again.", "error");
        // Revert the change
        params.node.setDataValue(params.colDef.field, params.oldValue);
      }
    } catch (error) {
      console.error("Error updating remark:", error);
      notify("Failed to update remark. Please try again.", "error");
      // Revert the change
      params.node.setDataValue(params.colDef.field, params.oldValue);
    } finally {
      setLoading(false);
    }
  };

  // Fetch remarks for the student
  const fetchRemarks = useCallback(async () => {
    if (!student?.id || !batchId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/va-remarks?student_id=${student.id}&batch_id=${batchId}`);
      if (response.ok) {
        const data = await response.json();
        setRemarks(data);
      } else {
        console.error("Failed to fetch remarks");
        notify("Failed to fetch remarks.", "error");
      }
    } catch (error) {
      console.error("Error fetching remarks:", error);
      notify("Error loading remarks.", "error");
    } finally {
      setLoading(false);
    }
  }, [student?.id, batchId, notify]);

  // Submit new remark
  const handleSubmitRemark = async () => {
    if (!newRemark.trim() || !student?.id || !batchId) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/va-remarks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: student.id,
          batch_id: batchId,
          remarks: newRemark.trim(),
        }),
      });

      if (response.ok) {
        setNewRemark(""); // Clear the input
        await fetchRemarks(); // Refresh the remarks list
        setDataChanged(true); // Mark that data has changed
        notify("Remark added successfully!", "success");
      } else {
        console.error("Failed to submit remark");
        notify("Failed to add remark. Please try again.", "error");
      }
    } catch (error) {
      console.error("Error submitting remark:", error);
      notify("Failed to add remark. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch remarks when modal opens and get current user
  useEffect(() => {
    if (open) {
      fetchCurrentUser();
      if (student?.id && batchId) {
        fetchRemarks();
      }
    }
  }, [open, student?.id, batchId, fetchRemarks, fetchCurrentUser]);

  // Custom close handler that calls onDataChange if data was modified
  const handleClose = () => {
    if (dataChanged && onDataChange) {
      onDataChange(); // Trigger refresh in parent component
    }
    onClose();
  };

  // Clear state when modal closes
  useEffect(() => {
    if (!open) {
      setNewRemark("");
      setRemarks([]);
      setDataChanged(false); // Reset the data changed flag
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogViewport>
          <DialogPopup className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Remarks - {student?.name || "Unknown Student"}</DialogTitle>
              <DialogDescription>
                View, add, edit, or delete remarks for {student?.name || "this student"} in this batch.
              </DialogDescription>
            </DialogHeader>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Past Remarks
              </Typography>

              <div className="ag-theme-alpine" style={{ height: 300, width: "100%" }}>
                <AgGridReact<Remark>
                  loading={loading}
                  rowData={remarks}
                  columnDefs={columnDefs}
                  defaultColDef={defaultColDef}
                  enableCellTextSelection={true}
                  onCellValueChanged={onCellValueChanged}
                  singleClickEdit={true}
                  stopEditingWhenCellsLoseFocus={true}
                />
              </div>
            </Box>

            <Box>
              <Typography variant="h6" gutterBottom>
                Add New Remark
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                placeholder="Enter your remark here..."
                value={newRemark}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  setNewRemark(e.target.value)
                }
                disabled={submitting}
              />
            </Box>

            <DialogFooter>
              <DialogButton onClick={handleSubmitRemark} disabled={!newRemark.trim() || submitting}>
                {submitting ? (
                  <>
                    <CircularProgress size={18} aria-hidden="true" />
                    <span className="sr-only">Adding remark</span>
                  </>
                ) : (
                  "Add remark"
                )}
              </DialogButton>
              <DialogClose
                ref={parentCloseRef}
                disabled={submitting}
                className="min-h-10 rounded-md border border-slate-400 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Close
              </DialogClose>
            </DialogFooter>

            <ConfirmationModal
              open={deleteConfirmOpen}
              handleClose={() => {
                setDeleteConfirmOpen(false);
                setRemarkToDelete(null);
              }}
              handleConfirm={handleDeleteRemark}
              title="Delete remark"
              message="Are you sure you want to delete this remark? This action cannot be undone."
              confirmColor="error"
              confirmLabel="Delete remark"
              fallbackFocus={() => parentCloseRef.current}
            />
          </DialogPopup>
        </DialogViewport>
      </DialogPortal>
    </Dialog>
  );
};

export default RemarksModal;
