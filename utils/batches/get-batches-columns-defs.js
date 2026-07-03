import BatchesActionsCell from "@/components/batches/BatchesActionsCell";
import BatchesDeleteCell from "../../components/batches/BatchesDeleteCell";
import AccessibleSelectCellEditor from "../../components/AccessibleSelectCellEditor";
import { numberComparator, textComparator } from "../grid-comparators";
import { createDateColumn } from "../ag-grid-column-helpers";
import { normalizeDateString } from "../course-days";

// ✅ Fetch staff options globally (avoids using hooks inside the function)
let staffOptions = [" "];
let courseOptions = [" "];

// Function to fetch staff members (only once)
const fetchStaffOptions = async () => {
  // Only run on client side
  if (typeof window === "undefined") return;

  try {
    const response = await fetch("/api/getusersdata"); // API that returns all staff members
    const data = await response.json();
    if (data.users) {
      staffOptions = [" ", ...data.users.map((user) => user.name)];
    }
  } catch (error) {
    console.error("Error fetching staff list:", error);
  }
};

// Function to fetch course options (only once)
const fetchCourseOptions = async () => {
  // Only run on client side
  if (typeof window === "undefined") return;

  try {
    const response = await fetch("/api/getcoursesdata"); // API that returns all courses
    const data = await response.json();
    if (data.courses) {
      courseOptions = data.courses.map((course) => course.course).filter((course) => course && course.trim() !== ""); // Remove null/empty values
    }
  } catch (error) {
    console.error("Error fetching course list:", error);
  }
};

// ✅ Function to determine batch status based on assigned coursestart and courseend dates
export const getBatchStatus = (params) => {
  if (!params || !params.data) return {};
  if (params.data.status === "COMPLETE" || params.data.status === "VERIFY") return params.data.status;
  if (!params.data.coursestart || !params.data.courseend) return "UNSTARTED";

  // Use normalizeDateString to ensure local timezone (IST) compatibility
  const todayStr = normalizeDateString(new Date());
  const startStr = normalizeDateString(params.data.coursestart);
  const endStr = normalizeDateString(params.data.courseend);

  if (!startStr || !endStr) return "UNSTARTED"; // Handle invalid dates
  // Compare as strings in YYYY-MM-DD format (works correctly with IST)
  if (todayStr < startStr) return "UNSTARTED";
  if (todayStr >= startStr && todayStr <= endStr) return "ONGOING";
  if (todayStr > endStr) return "VERIFY";

  return "UNSTARTED";
};

export const getBatchesColumnDefs = (handleRoster, handleDelete, userRole = "ADMINISTRATOR") => {
  return [
    {
      field: "actions",
      headerName: "Actions",
      headerTooltip: "Actions",
      width: 140,
      cellRenderer: (props) => BatchesActionsCell(props, handleRoster),
      sortable: true,
      filter: true,
      valueGetter: (params) => params.data?.batch || "",
      comparator: textComparator,
      resizable: false,
      editable: false,
      suppressKeyboardEvent: (params) => {
        const { event } = params;
        const cellElement = event.target.closest(".ag-cell");

        if (event.key === " " || event.key === "Space") {
          event.preventDefault();
          // Find the roster button in the cell and focus it
          const rosterButton = cellElement?.querySelector('button[title="Roster"]');
          if (rosterButton) {
            rosterButton.focus();
          }
          return true; // Suppress the default ag-Grid behavior
        }

        if (event.key === "Tab") {
          const activeElement = document.activeElement;
          const rosterButton = cellElement?.querySelector('button[title="Roster"]');
          const deleteButton = cellElement?.querySelector('button[aria-label="delete"]');

          if (activeElement === rosterButton && !event.shiftKey) {
            // Tab from Roster to Delete button
            event.preventDefault();
            if (deleteButton && !deleteButton.disabled) {
              deleteButton.focus();
            }
            return true;
          } else if (activeElement === deleteButton && event.shiftKey) {
            // Shift+Tab from Delete to Roster button
            event.preventDefault();
            if (rosterButton) {
              rosterButton.focus();
            }
            return true;
          }
        }

        return false; // Allow other keyboard events to proceed normally
      },
    },
    { field: "id", headerName: "ID", headerTooltip: "ID", editable: false, resizable: false, width: 80 },
    {
      field: "coursename",
      headerName: "Name",
      headerTooltip: "Name",
      width: 150,
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: () => ({ values: courseOptions }),
      comparator: textComparator,
    },

    {
      field: "strength",
      headerName: "Batch Capacity",
      headerTooltip: "Batch Capacity",
      width: 150,
      editable: false,
      comparator: numberComparator,
    },

    {
      field: "enrolled",
      headerName: "Enrolled Students",
      headerTooltip: "Enrolled Students",
      width: 164,
      editable: false,
      sortable: true,
      comparator: numberComparator,
    },
    {
      field: "dropped",
      headerName: "Dropped Students",
      headerTooltip: "Dropped Students",
      width: 166,
      editable: false,
      comparator: numberComparator,
    },
    {
      field: "attendance_percentage",
      headerName: "Attendance %",
      headerTooltip: "Attendance %",
      width: 150,
      editable: false,
      comparator: numberComparator,
    },
    {
      field: "assessment_percentage",
      headerName: "Assessment %",
      headerTooltip: "Assessment %",
      width: 150,
      editable: false,
      comparator: numberComparator,
    },
    {
      field: "participation_certificate",
      headerName: "Participation Certificate",
      headerTooltip: "Participation Certificate",
      width: 180,
      editable: false,
      cellRenderer: (params) => {
        const count = params.value || 0;
        return count.toString();
      },
      comparator: numberComparator,
    },
    {
      field: "participation_percentage",
      headerName: "Participation %",
      headerTooltip: "Participation %",
      width: 140,
      editable: false,
      comparator: numberComparator,
    },
    {
      field: "passing_students",
      headerName: "Passing Students",
      headerTooltip: "Passing Students",
      width: 150,
      editable: false,
      cellRenderer: (params) => {
        const count = params.value || 0;
        return count.toString();
      },
      comparator: numberComparator,
    },
    {
      field: "pass_percentage",
      headerName: "Pass %",
      headerTooltip: "Pass %",
      width: 100,
      editable: false,
      comparator: numberComparator,
    },
    {
      field: "completion_certificate",
      headerName: "Completion Certificate",
      headerTooltip: "Completion Certificate",
      width: 180,
      editable: false,
      cellRenderer: (params) => {
        const count = params.value || 0;
        return count.toString();
      },
      comparator: numberComparator,
    },
    {
      field: "completion_percentage",
      headerName: "Completion %",
      headerTooltip: "Completion %",
      width: 140,
      editable: false,
      comparator: numberComparator,
    },

    createDateColumn({
      field: "coursestart",
      headerName: "Start",
      width: 120,
      editable: true,
      extraProps: { headerTooltip: "Start" },
    }),
    createDateColumn({
      field: "courseend",
      headerName: "End",
      width: 130,
      editable: true,
      extraProps: { headerTooltip: "End" },
    }),
    { field: "coursedays", headerName: "Days", headerTooltip: "Days", width: 120, editable: false },
    { field: "coursetimes", headerName: "Time", headerTooltip: "Time", width: 120, editable: false },

    {
      field: "instructor",
      headerName: "Instructor",
      headerTooltip: "Instructor",
      width: 140,
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: () => ({ values: staffOptions }),
    },

    {
      field: "PM",
      headerName: "Program Manager",
      headerTooltip: "Program Manager",
      width: 160,
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: () => ({ values: staffOptions }),
    },

    {
      field: "TA",
      headerName: "Teaching Assistant",
      headerTooltip: "Teaching Assistant",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: () => ({ values: staffOptions }),
    },

    {
      field: "dataentry",
      headerName: "Data Entry Access",
      headerTooltip: "Data Entry Access",
      width: 180,
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: () => ({ values: staffOptions }),
    },

    { field: "cost", headerName: "Collected Fees", headerTooltip: "Collected Fees", width: 140, editable: false },
    { field: "currency", headerName: "Currency", headerTooltip: "Currency", width: 100, editable: false },

    // Training Mode dropdown
    {
      field: "trainingmode",
      headerName: "Training Mode",
      headerTooltip: "Training Mode",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: ["VIRTUAL", "IN-PERSON"] },
    },

    {
      field: "status",
      headerName: "Status",
      headerTooltip: "Status",
      width: 120,
      editable: (params) => {
        const status = getBatchStatus(params);
        return status === "COMPLETE" || status === "VERIFY";
      },
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: ["COMPLETE", "VERIFY"] },
      valueGetter: getBatchStatus,
      valueSetter: (params) => {
        // Save the new value to the actual data object
        params.data.status = params.newValue;
        return true;
      },
    },
    {
      field: "delete",
      headerName: "Delete",
      width: 80,
      cellStyle: { overflow: "visible", opacity: 1, visibility: "visible" },
      cellRenderer: (props) => BatchesDeleteCell(props, handleDelete, userRole),
      sortable: false,
      filter: false,
      resizable: false,
      editable: false,
      headerTooltip: "Delete",
      suppressKeyboardEvent: (params) => {
        const { event } = params;
        const cellElement = event.target.closest(".ag-cell");

        // Handle both Enter and Space keys for delete column
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          const deleteButton = cellElement?.querySelector('button[aria-label*="delete"], button[aria-label*="Delete"]');
          if (deleteButton) {
            deleteButton.focus();
            deleteButton.click();
          }
          return true; // Suppress the default ag-Grid behavior
        }

        return false;
      },
    },
  ];
};

// Only fetch options on client side
if (typeof window !== "undefined") {
  fetchStaffOptions();
  fetchCourseOptions();
}
