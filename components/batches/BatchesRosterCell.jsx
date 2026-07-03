import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import { useRouter } from "next/router";
import React from "react";

const BatchesRosterCell = (props, handleRoster) => {
  const router = useRouter();
  const id = props?.data?.id;
  if (!id) return null;

  return (
    <Box
      className="va-roster-cell"
      sx={{ display: "flex", gap: 1, alignItems: "center", opacity: 1, visibility: "visible", color: "inherit" }}
    >
      <Button
        color="primary"
        title="Roster"
        size="small"
        sx={{ textTransform: "none" }}
        onClick={(e) => {
          e.stopPropagation();
          handleRoster(props, router);
        }}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            handleRoster(props, router);
          }
        }}
        aria-label={`View roster for ${props.data?.batch || "batch"}`}
      >
        {props.data?.batch || "Roster"}
      </Button>
    </Box>
  );
};
export default BatchesRosterCell;
