import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import React from "react";

const SudentDeleteCell = (props, handleDelete, userRole = "ADMINISTRATOR") => {
  const isStaff = userRole === "STAFF";
  return (
    <IconButton
      aria-label="delete"
      onClick={() => handleDelete(props)}
      disabled={isStaff}
      sx={{ color: "error.main", opacity: 1, visibility: "visible" }}
    >
      <DeleteIcon sx={{ color: "inherit", opacity: 1, visibility: "visible" }} />
    </IconButton>
  );
};

export default SudentDeleteCell;
