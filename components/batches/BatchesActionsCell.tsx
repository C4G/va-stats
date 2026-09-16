import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useRouter } from "next/router";
import React from "react";

const BatchesActionsCell = (props, _handleRoster) => {
  const router = useRouter();
  const id = props?.data?.id;
  const batch = props?.data?.batch;
  if (!id) return null;

  const handleClick = (e) => {
    e.stopPropagation();
    // Navigate to batch detail page
    router.push(`/batch/${id}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/batch/${id}`);
    }
  };

  return (
    <Box
      className="va-actions-cell"
      sx={{
        display: "flex",
        gap: 1,
        alignItems: "center",
        opacity: 1,
        visibility: "visible",
        color: "inherit",
      }}
    >
      <Button
        color="primary"
        title="Roster"
        size="small"
        sx={{ textTransform: "none" }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={`View roster for ${batch || "batch"}`}
      >
        {batch}
      </Button>
    </Box>
  );
};
export default BatchesActionsCell;
