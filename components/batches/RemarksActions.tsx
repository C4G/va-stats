import { Button } from "@mui/material";
import { useState } from "react";
import RemarksModal from "./RemarksModal";

const RemarksActions = (props) => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = () => {
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        sx={{
          textTransform: "none",
          fontSize: "0.75rem",
          padding: "4px 8px",
        }}
        aria-label={`Open remarks for ${props.data?.name || "student"}`}
      >
        Remarks
      </Button>

      <RemarksModal
        open={modalOpen}
        onClose={handleClose}
        student={props.data}
        batchId={props.context?.batchId}
        onDataChange={props.context?.onDataChange}
      />
    </>
  );
};

export default RemarksActions;
