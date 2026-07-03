import { useEffect, useState } from "react";
import RemarksCellRenderer from "../../components/students/RemarksCellRenderer";
import StudentActionCell from "../../components/students/StudentActionCell";
import TelecallerRemarksCellRenderer from "../../components/students/TelecallerRemarksCellRenderer";
import AccessibleSelectCellEditor from "../../components/AccessibleSelectCellEditor";
import { convertNumberToYesNo } from "./convert-number-to-yes-no";
import { ENROLLMENT_STATUS } from "../types/enrollment";
import { createDateColumn } from "../ag-grid-column-helpers";

// Load countries data for dropdown (same as registration page)
let worldData = require("../../utils/countries+states.json");

const EDUCATION_SORT_ORDER = [
  "Below 10th Standard",
  "10th Standard",
  "12th Standard",
  "Diploma",
  "ITI",
  "Undergraduate",
  "Graduate",
  "Post-Graduate",
  "Professional Degree",
  "Other",
];

const educationSortMap = new Map(EDUCATION_SORT_ORDER.map((value, index) => [value.trim().toLowerCase(), index]));

const educationComparator = (valueA, valueB) => {
  const a = typeof valueA === "string" ? valueA.trim() : "";
  const b = typeof valueB === "string" ? valueB.trim() : "";

  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const aKey = a.toLowerCase();
  const bKey = b.toLowerCase();
  const aKnown = educationSortMap.has(aKey);
  const bKnown = educationSortMap.has(bKey);

  if (aKnown && bKnown) {
    return educationSortMap.get(aKey) - educationSortMap.get(bKey);
  }

  if (aKnown && !bKnown) return -1;
  if (!aKnown && bKnown) return 1;

  return a.localeCompare(b, undefined, { sensitivity: "base" });
};

export const useGetStudentColumnDefs = (handleHistory, handleDelete, role) => {
  const isTelecaller = role === "TELECALLER" || role === "TRAINER" || role === "TRAINERPLUSTELECALLER";
  const isAdmin = role === "ADMINISTRATOR";
  const isManagement = role === "MANAGEMENT";
  const [courseOptions, setCourseOptions] = useState([" "]);
  const [staffOptions, setStaffOptions] = useState([" "]); // Stores list of users (staff members)
  const [countryOptions, setCountryOptions] = useState([" "]);
  const canEditStatus = ["ADMINISTRATOR", "MANAGEMENT", "TELECALLER", "TRAINER", "TRAINERPLUSTELECALLER"].includes(
    role ?? ""
  );

  const labelOfEnrollmentStatus = (v) =>
    ENROLLMENT_STATUS.find((o) => o.value === (typeof v === "string" ? v.trim() : v))?.label ?? "Unassigned";

  // Fetch course options from API
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fetchCourseOptions = async () => {
      try {
        const response = await fetch("/api/getcoursesdata");
        const data = await response.json();
        if (data.courses) {
          setCourseOptions([" ", ...data.courses.map((course) => course.course)]);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    fetchCourseOptions();
  }, []);

  // Fetch all staff members for the Program Manager dropdown
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fetchStaffOptions = async () => {
      try {
        const response = await fetch("/api/getusersdata");
        const data = await response.json();
        if (data.users) {
          setStaffOptions([" ", ...data.users.map((user) => user.name)]);
        }
      } catch (error) {
        console.error("Error fetching staff list:", error);
      }
    };

    fetchStaffOptions();
  }, []);

  // Load country options from countries+states.json
  useEffect(() => {
    if (typeof window === "undefined" || !worldData) return;
    const countries = worldData.map((country) => country.name).sort();
    setCountryOptions([" ", ...countries]);
  }, []);

  // Education options from registration page
  const educationOptions = [
    " ",
    "Below 10th Standard",
    "10th Standard",
    "12th Standard",
    "Diploma",
    "ITI",
    "Undergraduate",
    "Graduate",
    "Post-Graduate",
    "Professional Degree",
    "Other",
  ];

  // Disability options from registration page
  const disabilityOptions = [" ", "Visually Impaired", "VI With Other Disability", "Other Disability", "Non-disabled"];

  // Reference/Source options from registration page
  const referenceOptions = [
    " ",
    "Vision-Aid staff",
    "Whatsapp Group",
    "Friend or Alumni",
    "Word of mouth",
    "Social Media/ News paper",
    "Hospital/Doctor/Rehabilitation center",
    "School Partners",
    "Vision-Aid Website",
    "Other",
  ];

  // Employment Status options from registration page
  const employmentStatusOptions = [" ", "Employed", "Unemployed", "Student"];

  // Learning Goals (objectives) options from registration page
  const learningGoalsOptions = [
    " ",
    "To learn new skills",
    "To upskill/reskill",
    "For employment opportunities",
    "Other",
  ];

  const columns = [
    {
      field: "actions",
      headerName: "Actions",
      width: 85,
      cellRenderer: (props) => StudentActionCell(props, handleHistory, handleDelete),
      cellClass: "!flex !items-center !justify-center",
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
    { field: "id", headerName: "Id" },
    {
      field: "enrollment_status",
      headerName: "Current Enrollment Status",
      editable: canEditStatus,
      cellEditor: AccessibleSelectCellEditor,
      // empty value("") is used as 'Unassigned' state → forced selection UX
      cellEditorParams: { values: ENROLLMENT_STATUS.map((o) => o.value ?? "") },
      suppressKeyboardEvent: (params) => {
        // Allow Space and Enter to be handled by the editor
        return params.editing && (params.event.key === " " || params.event.key === "Enter");
      },
      valueFormatter: (p) => {
        const v = typeof p.value === "string" ? p.value.trim() : p.value;
        return ENROLLMENT_STATUS.find((o) => o.value === v)?.label ?? v;
      },
      cellRenderer: (p) => labelOfEnrollmentStatus(p.value),
      comparator: (a, b) => labelOfEnrollmentStatus(a).localeCompare(labelOfEnrollmentStatus(b)),
    },

    { field: "name", editable: isAdmin },
    {
      field: "edu_qualifications",
      headerName: "Education",
      editable: isAdmin,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: educationOptions },
      suppressKeyboardEvent: (params) => {
        return params.editing && (params.event.key === " " || params.event.key === "Enter");
      },
      cellRenderer: (params) => params.value || "",
      comparator: educationComparator,
    },
    { field: "phone_number", headerName: "Phone Number", editable: isAdmin },
    { field: "alt_ph_num", headerName: "Parent / Guardian Phone Number" },
    { field: "city" },
    { field: "state" },
    { field: "email", headerName: "Email" },

    // Gender dropdown
    {
      field: "gender",
      headerName: "Gender",
      editable: isAdmin,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: [" ", "Male", "Female", "Other"] },
      cellRenderer: (params) => params.value || "",
    },

    createDateColumn({
      field: "age",
      headerName: "Date of Birth",
      editable: isAdmin,
      filter: "agDateColumnFilter",
    }),

    // Visual Acuity dropdown
    {
      field: "visual_acuity",
      headerName: "Visual Acuity",
      editable: isAdmin,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: [" ", "LowVision", "Blind", "Sighted"] },
      cellRenderer: (params) => params.value || "",
    },

    { field: "percent_loss", headerName: "Percent Loss" },
    {
      field: "employment_status",
      headerName: "Job Status",
      editable: isAdmin,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: employmentStatusOptions },
      cellRenderer: (params) => params.value || "",
    },
    { field: "Designation" },
    { field: "Languages_Known", headerName: "Languages Known" },

    // Program Manager dropdown
    {
      field: "Program_ManagerCoordinator",
      headerName: "Program Manager/Coordinator",
      editable: isAdmin,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: staffOptions }, // List of staff members
      cellRenderer: (params) => params.value || "",
    },

    {
      field: "country",
      editable: isAdmin,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: countryOptions },
      cellRenderer: (params) => params.value || "",
    },
    {
      field: "disability",
      headerName: "Nature of Disability",
      editable: isAdmin,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: disabilityOptions },
      cellRenderer: (params) => params.value || "",
    },
    { field: "edu_details", headerName: "Education Details" },
    {
      field: "objectives",
      headerName: "Learning Goals",
      editable: isAdmin,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: learningGoalsOptions },
      cellRenderer: (params) => params.value || "",
    },

    // Course choices dropdowns
    {
      field: "first_choice",
      headerName: "First Choice",
      editable: isAdmin || isManagement,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: courseOptions },
      cellRenderer: (params) => params.value || "",
    },
    {
      field: "second_choice",
      headerName: "Second Choice",
      editable: isAdmin || isManagement,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: courseOptions },
      cellRenderer: (params) => params.value || "",
    },
    {
      field: "third_choice",
      headerName: "Third Choice",
      editable: isAdmin || isManagement,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: courseOptions },
      cellRenderer: (params) => params.value || "",
    },

    // Recommendations dropdowns (Now using the same options as course choices)
    {
      field: "first_recommendation",
      headerName: "First Recommendation",
      editable: isAdmin || isTelecaller,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: courseOptions },
      cellRenderer: (params) => params.value || "",
    },
    {
      field: "second_recommendation",
      headerName: "Second Recommendation",
      editable: isAdmin || isTelecaller,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: courseOptions },
      cellRenderer: (params) => params.value || "",
    },
    {
      field: "third_recommendation",
      headerName: "Third Recommendation",
      editable: isAdmin || isTelecaller,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: courseOptions },
      cellRenderer: (params) => params.value || "",
    },
    {
      field: "telecaller_remarks",
      headerName: "Telecaller Remarks",
      editable: isTelecaller,
      autoHeight: true,
      cellRenderer: isTelecaller ? undefined : (params) => TelecallerRemarksCellRenderer(params),
      headerTooltip: isTelecaller ? "Add your remarks for this student" : "Remarks from telecallers",
    },
    { field: "impairment_history", headerName: "Impairment History" },
    {
      field: "source",
      headerName: "Reference",
      editable: isAdmin,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: referenceOptions },
      cellRenderer: (params) => params.value || "",
    },
    {
      field: "risk_factor",
      headerName: "Risk Factor",
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: {
        values: ["", "Medium", "High"],
      },
    },
    createDateColumn({
      field: "registration_date",
      headerName: "Registration Date",
      editable: isAdmin,
      filter: "agDateColumnFilter",
    }),
    {
      field: "id_proof",
      headerName: "ID Proof",
      cellEditor: AccessibleSelectCellEditor,
      valueGetter: (params) => convertNumberToYesNo(params.data.id_proof),
      cellEditorParams: {
        values: ["No", "Yes"],
      },
    },
    {
      field: "disability_cert",
      headerName: "Disability Certificate",
      cellEditor: AccessibleSelectCellEditor,
      valueGetter: (params) => convertNumberToYesNo(params.data.disability_cert),
      cellEditorParams: {
        values: ["No", "Yes"],
      },
    },
    {
      field: "photo",
      headerName: "Photo",
      cellEditor: AccessibleSelectCellEditor,
      valueGetter: (params) => convertNumberToYesNo(params.data.photo),
      cellEditorParams: {
        values: ["No", "Yes"],
      },
    },
    {
      field: "bank_details",
      headerName: "Bank Details",
      cellEditor: AccessibleSelectCellEditor,
      valueGetter: (params) => convertNumberToYesNo(params.data.bank_details),
      cellEditorParams: {
        values: ["No", "Yes"],
      },
    },
    // { field: 'completion_status', headerName: 'Completion Status' },
    // { field: 'reason_for_status', headerName: 'Reason for Status' },
    // { field: 'certification_eligibility', headerName: 'Certification Eligibility' },
    {
      field: "remarks",
      headerName: "Remarks",
      editable: false,
      autoHeight: true,
      cellRenderer: (params) => RemarksCellRenderer(params),
    },
  ];

  return columns;
};
