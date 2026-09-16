import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import React from "react";

const BatchesDeleteCell = (props, handleDelete, userRole = "ADMINISTRATOR") => {
  const isStaff = userRole === "STAFF";
  const id = props?.data?.id;
  if (!id) return null;

  return (
    <Box
      className="va-delete-cell"
      sx={{ display: "flex", gap: 1, alignItems: "center", opacity: 1, visibility: "visible", color: "inherit" }}
    >
      <IconButton
        aria-label={`Delete batch ${props.data?.batch || "batch"}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isStaff) handleDelete(props);
        }}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !isStaff) {
            e.preventDefault();
            e.stopPropagation();
            handleDelete(props);
          }
        }}
        sx={{ color: "error.main", opacity: 1, visibility: "visible" }}
        disabled={isStaff}
        size="small"
        tabIndex={isStaff ? -1 : 0}
      >
        <DeleteIcon sx={{ color: "inherit", opacity: 1, visibility: "visible" }} />
      </IconButton>
    </Box>
  );
};
export default BatchesDeleteCell;
