import Snackbar from "@mui/material/Snackbar";
import Alert, { type AlertColor } from "@mui/material/Alert";

/**
 * GlobalSnackbar component displays a Snackbar with an Alert.
 *
 * @param {Object} props - The properties object.
 * @param {number} [props.duration=10000] - Duration in milliseconds for which the Snackbar is visible.
 * @param {string} [props.message='The data was saved!'] - The message to display inside the Alert.
 * @param {boolean} props.open - Boolean flag to control the visibility of the Snackbar.
 * @param {Function} props.setOpen - Function to set the open state of the Snackbar.
 * @param {string} [props.severity='success'] - The severity level of the Alert. Can be 'error', 'warning', 'info', or 'success'.
 * @returns {JSX.Element} The rendered GlobalSnackbar component.
 */
type GlobalSnackbarProps = {
  duration?: number;
  message?: string;
  open: boolean;
  setOpen: (_open: boolean) => void;
  severity?: AlertColor;
};

const GlobalSnackbar = (props: GlobalSnackbarProps) => {
  const { duration = 10000, message = "The data was saved!", setOpen, severity = "success" } = props;
  const handleClose = () => setOpen(false);

  return (
    <div>
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        open={props.open}
        autoHideDuration={duration}
        onClose={handleClose}
      >
        <Alert onClose={handleClose} severity={severity} variant="filled" sx={{ width: "100%" }}>
          {message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default GlobalSnackbar;
