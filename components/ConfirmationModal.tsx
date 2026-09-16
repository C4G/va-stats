import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import Button from "@mui/material/Button";

const ConfirmationModal = ({ open, handleClose, handleConfirm, title, message, confirmColor }) => {
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
    >
      <DialogTitle id="confirmation-dialog-title">{title ?? "Confirm Action"}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirmation-dialog-description" sx={{ whiteSpace: "pre-line" }}>
          {message ?? "Are you sure you want to proceed?"}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary" sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          color={confirmColor ?? "primary"}
          variant="contained"
          sx={{ textTransform: "none" }}
          autoFocus
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationModal;
