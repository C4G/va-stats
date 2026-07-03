import StudentDeleteCell from "../components/students/StudentDeleteCell";
import AccessibleSelectCellEditor from "../components/AccessibleSelectCellEditor";
import { normalizeDateValue } from "./date-normalizers";
import { toDisplay } from "./types/date";
import { createDateColumn } from "./ag-grid-column-helpers";

// ✅ Fetch staff options globally (avoids using hooks inside the function)
let staffOptions = [" "]; // Ensure default is empty
let designationOptions = [
  "Trainer",
  "Teaching Assistant",
  "Program Coordinator",
  "Telecaller",
  "Training Coordinator",
  "Program Manager",
  "Sr. Trainer",
  "L & D Executive",
  "Head of Training",
  "Trainer Cum Telecaller",
];
let hasRequestedStaffOptions = false;

// Function to fetch staff members (only once)
const fetchStaffOptions = async () => {
  try {
    const response = await fetch("/api/getusersdata"); // API that returns all staff members
    const data = await response.json();
    if (data.users) {
      staffOptions = [" ", ...data.users.map((user) => user.name)]; // Keep an empty option
    }
  } catch (error) {
    console.error("Error fetching staff list:", error);
  }
};

const calculateContractEndDate = (params) => {
  if (!params.data.joindate || !params.data.contract_duration_months) return "";

  const startDate = new Date(params.data.joindate);
  startDate.setMonth(startDate.getMonth() + parseInt(params.data.contract_duration_months, 10));

  return toDisplay(startDate);
};

// Dropdown options
const courseOptions = [
  " ",
  "Python",
  "C",
  "C++",
  "CCA",
  "PHP",
  "HTML",
  "Mobile Technology",
  "CSS",
  "Excel",
  "DAT",
  "SEP B",
  "Chatgpt",
];
const roleOptions = [" ", "STAFF", "MANAGEMENT", "ADMINISTRATOR", "TELECALLER", "TRAINER", "TRAINERPLUSTELECALLER"];
const staffStatusOptions = [" ", "A", "IA"];
const visualAcuityOptions = [" ", "LowVision", "Blind", "Sighted"];
const genderOptions = [" ", "Male", "Female"];
const natureOfWorkOptions = [" ", "Full-Time", "Part-Time"];

export const getUsersColumnDefs = (handleDelete, designationOptionsOverride) => {
  if (typeof window !== "undefined" && !hasRequestedStaffOptions) {
    hasRequestedStaffOptions = true;
    fetchStaffOptions();
  }

  const effectiveDesignationOptions =
    Array.isArray(designationOptionsOverride) && designationOptionsOverride.length > 0
      ? designationOptionsOverride
      : designationOptions;

  return [
    {
      field: "delete",
      headerName: "",
      width: 76,
      maxWidth: 100,
      cellStyle: { overflow: "visible", opacity: 1, visibility: "visible" },
      cellRenderer: (props) => StudentDeleteCell(props, handleDelete),
      sortable: false,
      filter: false,
      resizable: false,
      editable: false,
      suppressKeyboardEvent: (params) => {
        const { event } = params;
        const cellElement = event.target.closest(".ag-cell");
        const button = cellElement?.querySelector("button");

        // Handle both Enter and Space keys for actions column
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (button) {
            button.focus();
            button.click();
          }
          return true;
        }

        // Allow normal tab navigation
        if (event.key === "Tab") {
          return false;
        }

        return false;
      },
    },
    { field: "name", headerName: "Name" },
    { field: "employeeId", headerName: "Employee Number" },
    { field: "mobilenumber", headerName: "Contact Number" },

    // Gender dropdown
    {
      field: "gender",
      headerName: "Gender",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: genderOptions },
      cellRenderer: (params) => params.value || "",
    },

    createDateColumn({
      field: "date_of_birth",
      headerName: "Date of Birth",
      filter: "agDateColumnFilter",
    }),

    // Visual Acuity dropdown
    {
      field: "visualacuity",
      headerName: "Visual Acuity",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: visualAcuityOptions },
      cellRenderer: (params) => params.value || "",
    },

    { field: "workbase", headerName: "Work Location" },

    // Designation dropdown
    {
      field: "designation",
      headerName: "Designation",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: effectiveDesignationOptions },
      cellRenderer: (params) => params.value || "",
    },

    // ✅ Supervisor Dropdown (Uses all staff names)
    {
      field: "supervisor",
      headerName: "Supervisor",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: staffOptions }, // Uses globally fetched staff options
      cellRenderer: (params) => params.value || " ",
    },

    createDateColumn({
      field: "joindate",
      headerName: "Date of Joining",
      filter: "agDateColumnFilter",
    }),

    // Nature of Work dropdown
    {
      field: "natureofjob",
      headerName: "Nature of Work",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: natureOfWorkOptions },
      cellRenderer: (params) => params.value || "",
    },

    {
      field: "contract_duration_months",
      headerName: "Duration of Contract",
      type: "numericColumn",
    },
    {
      ...createDateColumn({
        field: "contract_end_date",
        headerName: "Contract Close Date",
        filter: "agDateColumnFilter",
        editable: true,
      }),
      valueGetter: (params) => {
        const value = params.data?.contract_end_date;
        if (value) return toDisplay(value);
        return calculateContractEndDate(params);
      },
      valueSetter: (params) => {
        params.data.contract_end_date = normalizeDateValue(params.newValue) || null;
        return true;
      },
    },
    { field: "email", headerName: "Official Email" },

    // Training program dropdowns
    {
      field: "trainingprogram1",
      headerName: "Training Program 1",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: courseOptions },
      cellRenderer: (params) => params.value || "",
    },
    {
      field: "trainingprogram2",
      headerName: "Training Program 2",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: courseOptions },
      cellRenderer: (params) => params.value || "",
    },
    {
      field: "trainingprogram3",
      headerName: "Training Program 3",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: courseOptions },
      cellRenderer: (params) => params.value || "",
    },

    // Role dropdown
    {
      field: "role",
      headerName: "Role",
      editable: true,
      width: 140,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: roleOptions },
      cellRenderer: (params) => params.value || "",
    },

    // Staff Working Status dropdown
    {
      field: "isactive",
      headerName: "Staff Working Status",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: staffStatusOptions },
      cellRenderer: (params) => params.value || "",
    },
    createDateColumn({
      field: "lastlogin",
      headerName: "Last Login",
      editable: false,
      filter: "agDateColumnFilter",
    }),
  ];
};
