import MoreVertIcon from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import React from "react";

const StudentActionCellBulkRegistration = (props, handleDelete) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleKeyDown = (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      handleMenuOpen(event);
    }
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    if (typeof handleDelete === "function") {
      handleDelete(props);
    }
  };

  return (
    <>
      <IconButton
        aria-label={props.data.name + " Actions"}
        aria-controls="student-action-menu"
        aria-haspopup="true"
        aria-expanded={open}
        size="small"
        onClick={handleMenuOpen}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        id="student-action-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        MenuListProps={{
          autoFocus: true,
          autoFocusItem: true,
          "aria-labelledby": "student-action-menu",
          role: "menu",
          onKeyDown: (event) => {
            if (event.key === "Tab") {
              event.preventDefault();
              // Handle tab navigation manually
              const menuItems = event.currentTarget.querySelectorAll('[role="menuitem"]');
              const currentIndex = Array.from(menuItems).findIndex((item) => item === document.activeElement);

              let nextIndex;
              if (event.shiftKey) {
                // Shift+Tab - go to previous item
                nextIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
              } else {
                // Tab - go to next item
                nextIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
              }

              menuItems[nextIndex]?.focus();
            } else if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              handleMenuClose();
            }
          },
        }}
      >
        {
          <MenuItem
            onClick={handleDeleteClick}
            role="menuitem"
            tabIndex={-1}
            className="text-red-600 hover:text-red-800"
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleDeleteClick();
              }
            }}
          >
            Delete
          </MenuItem>
        }
      </Menu>
    </>
  );
};

export default StudentActionCellBulkRegistration;
