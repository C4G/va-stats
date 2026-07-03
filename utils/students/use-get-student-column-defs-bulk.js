import { useEffect, useState } from "react";
import StudentActionCellBulkRegistration from "../../components/students/StudentActionCellBulkRegistration";
import AccessibleSelectCellEditor from "../../components/AccessibleSelectCellEditor";
import { createDateColumn } from "../ag-grid-column-helpers";
import tableStyles from "../../styles/Table.module.css";

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

export const useGetStudentColumnDefs = (handleDelete) => {
  const [courseOptions, setCourseOptions] = useState([" "]);
  const ROW_STATUSES = {
    success: `✅ Successfully Registered`,
    duplicate: `⚠️ Duplicate Found in the Database`,
    error: (numErrors) => `❌ Data Errors Found (${numErrors ? numErrors : 0})`,
    unvalidated: `⏳ Not Yet Validated`,
    validated: `🔵 Validated - Ready for Registration`,
  };

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

  const TOOLTIPS = {
    name: "Enter the full name of the student.",
    gender: "Select the gender of the student.",
    age: "Enter the date of birth of the student.",
    phone_number: "Enter the phone number of the student.",
    email: "Enter the email address of the student (if available).",
    alt_ph_num: "Enter the phone number of the parent or guardian (if available).",
    country: "Select the country of residence of the student.",
    state: "Select the state of residence of the student.",
    city: "Enter the city of residence of the student.",
    disability: "Select the nature of the student's disability.",
    edu_qualifications: "Select the highest educational qualification of the student.",
    employment_status: "Select the current employment status of the student.",
    visual_acuity: "Select the visual acuity level of the student.",
    percent_loss: "Enter the percentage of vision loss of the student.",
    impairment_history: "Enter any relevant history about the student's impairment (if available).",
    first_choice: "Select the first choice of course for the student.",
    second_choice: "Select the second choice of course for the student (if available).",
    third_choice: "Select the third choice of course for the student (if available).",
    edu_details: "Enter any additional details about the student's education (if available).",
    objectives: "Select the learning objectives of the student for enrolling in the course.",
    source: "Select how the student heard about the program.",
  };

  const tooltipValueGetterFunction = (params) => {
    const errors = params.data?._errors?.[params.colDef.field] ?? [];
    if (errors.length > 0) {
      return `Error: ${errors.join(". ")}`;
    }
    return TOOLTIPS[params.colDef.field] || "";
  };

  const cellAriaLabelFunction = (params) => {
    const fieldName = params.colDef.headerName;
    const errors = params.data?._errors?.[params.colDef.field] ?? [];
    const value = params.value ? params.value : "No Value";
    if (errors.length > 0) {
      return `${fieldName}: ${value}. Error: ${errors.join(". ")}`;
    }
    return `${fieldName}: ${value}. ${TOOLTIPS[params.colDef.field] || ""}`;
  };

  const requiredHeaderStyle = (params) => {
    return params.colDef.required ? tableStyles.requiredHeader : "";
  };

  const updateCellClasses = (params) => {
    const classes = [tableStyles.formHeaderOverflow];
    if (params.data.errors?.name) {
      classes.push(tableStyles.formCellError);
    }
    return classes;
  };

  const columns = [
    {
      field: "actions",
      headerName: "Actions",
      width: 85,
      cellRenderer: (props) => StudentActionCellBulkRegistration(props, handleDelete),
      cellClass: "!flex !items-center !justify-center",
      sortable: false,
      filter: false,
      resizable: false,
      pinned: "left",
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
    {
      field: "id",
      headerName: "Row ID",
      editable: false,
      pinned: "left",
      filter: false,
      hide: false,
      width: 110,
    },
    {
      field: "_rowStatus",
      headerName: "Row Status",
      editable: false,
      width: 300,
      pinned: "left",
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: (params) => {
        const rowStatus = params.data?._rowStatus;
        if (rowStatus === "error") {
          const numErrors = params.data?._errors
            ? Object.values(params.data._errors).reduce((sum, arr) => sum + arr.length, 0)
            : 0;
          return `This row has ${numErrors} error(s). Please fix the errors to proceed. Hover over each cell to see the specific error messages.`;
        } else if (rowStatus === "duplicate") {
          return `This row appears to have a duplicate in the database based on the (gender, age, phone number) combination. Please review and make any necessary changes to continue.`;
        } else if (rowStatus === "validated") {
          return `This row has been validated and is ready for registration. Please review all details for accuracy before submitting.`;
        } else if (rowStatus === "unvalidated") {
          return `This row has unchecked changes or has not yet been validated. Please use the 'Check Rows' button to validate.`;
        } else if (rowStatus === "success") {
          return `This row has been successfully registered and can no longer be edited. If you need to make changes, please go to the 'Students' page.`;
        } else {
          return `Status of the row: ${ROW_STATUSES[rowStatus]}`;
        }
      },
      cellAriaLabel: (params) => {
        const rowStatus = params.data?._rowStatus;
        if (rowStatus === "error") {
          const numErrors = params.data?._errors
            ? Object.values(params.data._errors).reduce((sum, arr) => sum + arr.length, 0)
            : 0;
          return `This row has ${numErrors} error(s). Please fix the errors to proceed. Hover over each cell to see the specific error messages.`;
        } else if (rowStatus === "duplicate") {
          return `This row appears to have a duplicate in the database based on the (gender, age, phone number) combination. Please review and make any necessary changes to continue.`;
        } else if (rowStatus === "validated") {
          return `This row has been validated and is ready for registration. Please review all details for accuracy before submitting.`;
        } else if (rowStatus === "unvalidated") {
          return `This row has unchecked changes or has not yet been validated. Please use the 'Check Rows' button to validate.`;
        } else if (rowStatus === "success") {
          return `This row has been successfully registered and can no longer be edited. If you need to make changes, please go to the 'Students' page.`;
        } else {
          return `Status of the row: ${ROW_STATUSES[rowStatus]}`;
        }
      },
      cellRenderer: (params) => {
        const rowStatus = params.data?._rowStatus;
        console.log("row status", params.data?._rowStatus, params.data);

        if (!rowStatus) return "";

        if (rowStatus == "error") {
          // count sum of lengths of all error arrays in params.data.errors
          const numErrors = params.data?._errors
            ? Object.values(params.data._errors).reduce((sum, arr) => sum + arr.length, 0)
            : 0;
          return ROW_STATUSES[rowStatus](numErrors);
        } else {
          return ROW_STATUSES[rowStatus] || rowStatus;
        }
      },
    },
    {
      field: "name",
      headerName: "Name",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      required: true,
      headerClass: requiredHeaderStyle,
      width: 200,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
    // Gender dropdown
    {
      field: "gender",
      headerName: "Gender",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: [" ", "Male", "Female", "Other"] },
      cellRenderer: (params) => params.value || "",
      required: true,
      headerClass: requiredHeaderStyle,
      width: 120,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
    createDateColumn({
      field: "age",
      headerName: "Date of Birth",
      width: 160,
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      filter: "agDateColumnFilter",
      extraProps: {
        required: true,
        headerClass: requiredHeaderStyle,
        wrapText: false,
        cellClass: updateCellClasses,
        tooltipValueGetter: tooltipValueGetterFunction,
        cellAriaLabel: cellAriaLabelFunction,
      },
    }),
    {
      field: "phone_number",
      headerName: "Phone Number",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      required: true,
      headerClass: requiredHeaderStyle,
      width: 170,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
    {
      field: "email",
      headerName: "Email",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      required: false,
      headerClass: requiredHeaderStyle,
      width: 220,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
    {
      field: "alt_ph_num",
      headerName: "Parent / Guardian Phone Number",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      required: false,
      headerClass: requiredHeaderStyle,
      width: 270,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
    {
      field: "country",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: () => {
        return {
          values: ["", ...worldData.map((country) => country.name)],
        };
      },
      cellRenderer: (params) => params.value || "",
      required: true,
      headerClass: requiredHeaderStyle,
      width: 150,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
    {
      field: "state",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: (params) => {
        const currentCountry = params.data.country;
        const statesInCountry = worldData.find((country) => country.name === currentCountry)?.states || [];
        return {
          values: ["", ...statesInCountry.map((state) => state.name)],
        };
      },
      required: true,
      headerClass: requiredHeaderStyle,
      width: 150,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
    {
      field: "city",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      required: true,
      headerClass: requiredHeaderStyle,
      width: 150,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
    {
      field: "disability",
      headerName: "Nature of Disability",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: disabilityOptions },
      cellRenderer: (params) => params.value || "",
      required: true,
      headerClass: requiredHeaderStyle,
      width: 200,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
    {
      field: "edu_qualifications",
      headerName: "Education",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: educationOptions },
      suppressKeyboardEvent: (params) => {
        return params.editing && (params.event.key === " " || params.event.key === "Enter");
      },
      cellRenderer: (params) => params.value || "",
      comparator: educationComparator,
      required: true,
      headerClass: requiredHeaderStyle,
      width: 200,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
    {
      field: "employment_status",
      headerName: "Job Status",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: employmentStatusOptions },
      cellRenderer: (params) => params.value || "",
      required: true,
      headerClass: requiredHeaderStyle,
      width: 150,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
    // Visual Acuity dropdown
    {
      field: "visual_acuity",
      headerName: "Visual Acuity",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: [" ", "LowVision", "Blind", "Sighted"] },
      cellRenderer: (params) => params.value || "",
      required: true,
      headerClass: requiredHeaderStyle,
      width: 160,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
    {
      field: "percent_loss",
      headerName: "Percentage of Vision Loss",
      required: true,
      headerClass: requiredHeaderStyle,
      width: 240,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
    },
    {
      field: "impairment_history",
      headerName: "Impairment History",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      required: false,
      headerClass: requiredHeaderStyle,
      width: 220,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
    // Course choices dropdowns
    {
      field: "first_choice",
      headerName: "First Choice",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: courseOptions },
      cellRenderer: (params) => params.value || "",
      required: true,
      headerClass: requiredHeaderStyle,
      width: 200,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
    {
      field: "second_choice",
      headerName: "Second Choice",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: courseOptions },
      cellRenderer: (params) => params.value || "",
      required: false,
      headerClass: requiredHeaderStyle,
      width: 200,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
    {
      field: "third_choice",
      headerName: "Third Choice",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: courseOptions },
      cellRenderer: (params) => params.value || "",
      required: false,
      headerClass: requiredHeaderStyle,
      width: 200,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
    {
      field: "edu_details",
      headerName: "Education Details",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      required: false,
      headerClass: requiredHeaderStyle,
      width: 220,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
    {
      field: "objectives",
      headerName: "Learning Objectives",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: learningGoalsOptions },
      cellRenderer: (params) => params.value || "",
      required: true,
      headerClass: requiredHeaderStyle,
      width: 250,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
    {
      field: "source",
      headerName: "Reference",
      editable: (params) => (params.data._rowStatus === "success" ? false : true),
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: { values: referenceOptions },
      cellRenderer: (params) => params.value || "",
      required: true,
      headerClass: requiredHeaderStyle,
      width: 300,
      wrapText: false,
      cellClass: updateCellClasses,
      tooltipValueGetter: tooltipValueGetterFunction,
      cellAriaLabel: cellAriaLabelFunction,
    },
  ];

  return columns;
};
