import { Delete as DeleteIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { AgGridReact } from "ag-grid-react";
import React, { useCallback, useEffect, useState } from "react";
import { smartComparator } from "@/utils/grid-comparators";
import ConfirmationModal from "../ConfirmationModal";
import GlobalSnackbar from "../GlobalSnackbar";

const RemarksModal = ({ open, onClose, student, batchId, onDataChange }) => {
  const [remarks, setRemarks] = useState([]);
  const [newRemark, setNewRemark] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [remarkToDelete, setRemarkToDelete] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [dataChanged, setDataChanged] = useState(false);

  // Custom cell renderer for actions column
  const ActionsCellRenderer = (props) => {
    const canDelete = currentUser && props.data.user_id === currentUser.id;

    if (!canDelete) {
      return null;
    }

    const handleDeleteClick = () => {
      setRemarkToDelete(props.data);
      setDeleteConfirmOpen(true);
    };

    return (
      <IconButton
        size="small"
        color="error"
        onClick={handleDeleteClick}
        aria-label={`Delete remark by ${props.data.user_name}`}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    );
  };

  // Column definitions for the AG-Grid
  const columnDefs = [
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
        return currentUser && params.data.user_id === currentUser.id;
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
        setRemarkToDelete(null);
        setDataChanged(true); // Mark that data has changed
        // Show success toast
        setSnackbarMessage("Remark deleted successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      } else {
        console.error("Failed to delete remark");
        setSnackbarMessage("Failed to delete remark. Please try again.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Error deleting remark:", error);
      setSnackbarMessage("Failed to delete remark. Please try again.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle cell value changes (for editing remarks)
  const onCellValueChanged = async (params) => {
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
        setSnackbarMessage("Remark updated successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      } else {
        console.error("Failed to update remark");
        setSnackbarMessage("Failed to update remark. Please try again.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        // Revert the change
        params.node.setDataValue(params.colDef.field, params.oldValue);
      }
    } catch (error) {
      console.error("Error updating remark:", error);
      setSnackbarMessage("Failed to update remark. Please try again.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
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
        setSnackbarMessage("Failed to fetch remarks.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Error fetching remarks:", error);
      setSnackbarMessage("Error loading remarks.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [student?.id, batchId]);

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
        setSnackbarMessage("Remark added successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      } else {
        console.error("Failed to submit remark");
        setSnackbarMessage("Failed to add remark. Please try again.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Error submitting remark:", error);
      setSnackbarMessage("Failed to add remark. Please try again.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
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
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth aria-labelledby="remarks-dialog-title">
      <DialogTitle id="remarks-dialog-title">Remarks - {student?.name || "Unknown Student"}</DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Past Remarks
          </Typography>

          <div className="ag-theme-alpine" style={{ height: 300, width: "100%" }}>
            <AgGridReact
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
            onChange={(e) => setNewRemark(e.target.value)}
            disabled={submitting}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleSubmitRemark}
          variant="contained"
          disabled={!newRemark.trim() || submitting}
          sx={{ textTransform: "none" }}
        >
          {submitting ? <CircularProgress size={20} /> : "Add Remark"}
        </Button>
        <Button onClick={handleClose} disabled={submitting} sx={{ textTransform: "none" }}>
          Close
        </Button>
      </DialogActions>

      <ConfirmationModal
        open={deleteConfirmOpen}
        handleClose={() => {
          setDeleteConfirmOpen(false);
          setRemarkToDelete(null);
        }}
        handleConfirm={handleDeleteRemark}
        title="Delete Remark"
        message={`Are you sure you want to delete this remark? This action cannot be undone.`}
        confirmColor="error"
      />

      <GlobalSnackbar
        open={snackbarOpen}
        message={snackbarMessage}
        setOpen={setSnackbarOpen}
        severity={snackbarSeverity}
        duration={3000}
      />
    </Dialog>
  );
};

export default RemarksModal;
