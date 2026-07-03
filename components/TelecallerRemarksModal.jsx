import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { AgGridReact } from "ag-grid-react";
import { useState, useEffect, useCallback } from "react";
import { smartComparator } from "@/utils/grid-comparators";
import ConfirmationModal from "./ConfirmationModal";
import GlobalSnackbar from "./GlobalSnackbar";
import { dateTimeFormatter, parseDateTimeFromDB } from "@/utils/date-normalizers";

const TelecallerRemarksModal = ({ open, onClose, student }) => {
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

  // Custom cell renderer for actions column
  const ActionsCellRenderer = (props) => {
    const canDelete = currentUser && props.data.user_email === currentUser.email;

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
      field: "remark",
      headerName: "Remark",
      sortable: true,
      filter: true,
      flex: 1,
      wrapText: true,
      autoHeight: true,
      editable: (params) => {
        // Only allow editing if the current user is the author of the remark
        return currentUser && params.data.user_email === currentUser.email;
      },
      cellEditor: "agTextCellEditor",
      cellEditorParams: {
        maxLength: 1000,
        rows: 2,
        cols: 50,
      },
    },
    {
      field: "created_at",
      headerName: "Date Created",
      sortable: true,
      filter: true,
      width: 160,
      editable: false,
      valueFormatter: (params) => {
        if (params.value) {
          return dateTimeFormatter.format(new Date(parseDateTimeFromDB(params.value)));
        }
        return "";
      },
    },
    {
      field: "updated_at",
      headerName: "Last Updated",
      sortable: true,
      filter: true,
      width: 160,
      editable: false,
      valueFormatter: (params) => {
        if (params.value && params.value !== params.data.created_at) {
          return new Date(params.value).toLocaleString();
        }
        return "Not edited";
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
      const response = await fetch(`/api/telecaller-remarks/${remarkToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchRemarks(); // Refresh the remarks list
        setRemarkToDelete(null);
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
    if (params.colDef.field !== "remark" || !params.newValue || params.newValue === params.oldValue) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/telecaller-remarks/${params.data.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          remark: params.newValue.trim(),
        }),
      });

      if (response.ok) {
        // Show success message
        setSnackbarMessage("Remark updated successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        // Refresh the grid to get the updated timestamp
        await fetchRemarks();
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
    }
  };

  // Fetch remarks for the student
  const fetchRemarks = useCallback(async () => {
    if (!student?.id) {
      console.warn("Cannot fetch remarks: student ID is missing");
      setRemarks([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/telecaller-remarks?student_id=${student.id}`);

      // Check if response is OK
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorMessage = `Failed to fetch remarks: ${response.status}`;

        if (contentType?.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
            console.error("API error response:", errorData);
          } catch (e) {
            console.error("Failed to parse error JSON:", e);
          }
        } else {
          try {
            const text = await response.text();
            errorMessage = `${errorMessage}. Response: ${text.substring(0, 200)}`;
            console.error("Non-JSON error response:", text);
          } catch (e) {
            console.error("Failed to read error response:", e);
          }
        }

        console.error("Failed to fetch remarks:", errorMessage);

        // Show user-friendly error message based on status code
        if (response.status === 401) {
          setSnackbarMessage("You are not authorized to view remarks. Please log in again.");
        } else if (response.status === 400) {
          setSnackbarMessage("Invalid request. Please refresh the page and try again.");
        } else {
          setSnackbarMessage("Failed to fetch remarks. Please try again.");
        }
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setRemarks([]); // Set empty array on error
        return;
      }

      // Check Content-Type before parsing JSON
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        const text = await response.text();
        console.error(`Expected JSON but got ${contentType}. Response:`, text.substring(0, 100));
        throw new Error(`Expected JSON but got ${contentType}`);
      }

      const data = await response.json();
      setRemarks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching remarks:", error);
      setSnackbarMessage(
        error.message?.includes("JSON")
          ? "Invalid response from server. Please try again."
          : "Error loading remarks. Please try again."
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      setRemarks([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [student?.id]);

  // Submit new remark
  const handleSubmitRemark = async () => {
    if (!newRemark.trim() || !student?.id) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/telecaller-remarks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: student.id,
          remark: newRemark.trim(),
        }),
      });

      if (response.ok) {
        setNewRemark("");
        await fetchRemarks(); // Refresh the remarks list
      } else {
        console.error("Failed to submit remark");
      }
    } catch (error) {
      console.error("Error submitting remark:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch remarks when modal opens and get current user
  useEffect(() => {
    if (open) {
      fetchCurrentUser();
      if (student?.id) {
        fetchRemarks();
      }
    }
  }, [open, student?.id, fetchRemarks, fetchCurrentUser]);

  // Clear state when modal closes
  useEffect(() => {
    if (!open) {
      setNewRemark("");
      setRemarks([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="telecaller-remarks-dialog-title">
      <DialogTitle id="telecaller-remarks-dialog-title">
        Telecaller Remarks - {student?.name || "Unknown Student"}
      </DialogTitle>

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
        <Button onClick={onClose} disabled={submitting} sx={{ textTransform: "none" }}>
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

export default TelecallerRemarksModal;
