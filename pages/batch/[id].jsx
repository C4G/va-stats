/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/*
In useEffect: ESLint warning was removed using code below, including slashes;
may cause problems if changes are not tested thoroughly
// eslint-disable-next-line react-hooks/exhaustive-deps

VIEW MODIFICATIONS (BLUE BUTTONS): CODE REGIONS TO MODIFY (approx line numbers):
- const's:                              116
- batchPageLayoutHandler:               156
- data content for the view:            723 (TEMPORARILY shows generateBatchCompletionData as a TEST
  Switch it to generateBatchStatusData)
- useEffect: view of proper data chunk: 862
- show columns and other mtl correctly: 1224
- form and data:                        1276
*/

import Button from "@/components/Button";
import { getUserEmail } from "@/utils/session-helpers";
import { sortTable } from "@/utils/sort-table";
import { isClassDay, normalizeDateString, findMostRecentClassDate } from "@/utils/course-days";
import { generateBatchStatusReport } from "@/utils/generate-batch-status-report";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AccessibleSelectCellEditor from "../../components/AccessibleSelectCellEditor";
import { DataGrid } from "../../components/DataGrid";
import Navbar from "../../components/Navbar";
import StudentDeleteCell from "../../components/students/StudentDeleteCell";
import { TransferButtons } from "../../components/TransferButtons";
import styles from "../../styles/Home.module.css";
import tableStyles from "../../styles/Table.module.css";

//CODE BELOW IS ACTUALLY THE BATCH STATUS FORM ON THE BATCHES PAGE
import GlobalSnackbar from "@/components/GlobalSnackbar";
import { exportToCsv } from "@/utils/export-to-csv";
import { mapAttendanceDataToCsv } from "@/utils/map-attendance-data-to-csv";
import { convertNumberToYesNo } from "@/utils/students/convert-number-to-yes-no";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { AgGridReact } from "ag-grid-react";
import { smartComparator } from "@/utils/grid-comparators";
import {
  mergeBatchStatusDerivedRules,
  resolveCertificationEligibility,
  resolveCompletionStatus,
} from "@/utils/batch-status-derived";
import ConfirmationModal from "../../components/ConfirmationModal";
import RemarksActions from "../../components/batches/RemarksActions";
import RemarksCellRenderer from "../../components/students/RemarksCellRenderer";
import { dateFormatter, parseDateFromDateInput } from "@/utils/date-normalizers";

const staffAdminEmails = [
  "statstrainer1@gmail.com",
  "vedant.m94@gmail.com",
  "statstrainer2@gmail.com",
  "vastats.trainer@gmail.com",
];
const dataEntryEmails = ["testvisionaid@gmail.com"];

/*----------------- MISC FUNCTIONS BEGIN ----------------*/
function staffHasAccess(batchInfo, userInfo) {
  const { name: userName, email: userEmail, role: userAccessRole } = userInfo;
  const isAdmin = userAccessRole === "ADMINISTRATOR" || userAccessRole === "MANAGEMENT";
  if (isAdmin) return true;

  const norm = (s) => (s || "").toString().trim().toLowerCase();
  const userN = norm(userName);
  const allowedNames = [batchInfo["instructor"], batchInfo["TA"], batchInfo["PM"], batchInfo["dataentry"]].map(norm);

  if (allowedNames.includes(userN)) return true;
  if (userN && userN === norm(batchInfo["dataentry"])) return true;
  if (userN && userN === norm(batchInfo["TA"])) return true;
  if (staffAdminEmails.includes(userEmail) || dataEntryEmails.includes(userEmail)) return true;
  return false;
}
/*----------------- MISC FUNCTIONS END ----------------*/

export default function Page() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState("success");
  const [userResponse, setUserResponse] = useState({});
  const [batchData, setBatchData] = useState({});
  const [batchDocumentData, setBatchDocumentData] = useState({});

  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [toggleUnassignedStudents, setToggleUnassignedStudents] = useState(true);
  const origUnassignedStudents = useRef([]);
  const didInitRef = useRef(false);

  // Normalize display mapping for attendance values
  const toLabel = useCallback((raw) => {
    const map = {
      Present: "Present",
      Absent: "Absent",
      "Half-day": "Half-day",
      Cancelled: "Cancelled",
      Dropout: "Dropout",
    };
    const key = String(raw ?? "")
      .trim()
      .toUpperCase();
    return map[key] || raw;
  }, []);

  const valueFormatterMemo = useCallback((params) => toLabel(params.value), [toLabel]);

  const [showAttendance, setShowAttendance] = useState(true); /* Default active tab is Attendance */
  const [showGrades, setShowGrades] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState("");
  const [confirmModalMessage, setConfirmModalMessage] = useState("");
  const [confirmModalConfirmColor, setConfirmModalConfirmColor] = useState("primary");
  const confirmModalConfirmRef = useRef(null);
  const confirmModalCancelRef = useRef(null);
  const skipNextMaxMarksChangeRef = useRef(false);
  const skipNextAssignmentTypeChangeRef = useRef(false);

  const [showManagement, setShowManagement] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showAssessments, setShowAssessments] = useState(false);
  const [, setChangesRef] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [currentPanel, setCurrentPanel] = useState(0);
  const originalDataRef = useRef([]);

  const [courseName, setCourseName] = useState("");
  const [batchName, setBatchName] = useState("");
  const [batchLength, setBatchLength] = useState("");
  const [, setBatchTotalAmount] = useState("");
  const [, setBatchAmount1] = useState("");
  const [, setBatchAmount2] = useState("");
  const [, setBatchAmount3] = useState("");
  const [, setBatchCurrency] = useState("");

  const [attendanceColumn, setAttendanceColumn] = useState([]);
  const [attendanceColumnStaff, setAttendanceColumnStaff] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [gradeData, setGradeData] = useState([]);
  const [documentsData, setDocumentsData] = useState([]);
  const [assessmentsData, setAssessmentsData] = useState([]);
  const gridApiRef = useRef([]);
  const [updatedData, setUpdateData] = useState([]);

  // BATCH STATUS: VIEW, DATA SHOWN
  const [showBatchStatus, setShowBatchStatus] = useState(false);
  const [batchStatusData, setBatchStatusData] = useState([]);
  const [, setEditingColumn] = useState([]);

  const [gradesColumn, setGradesColumn] = useState([]);
  const [, setAssessmentsOptions] = useState([]);
  const allowedRoles = ["ADMINISTRATOR", "MANAGEMENT", "STAFF", "TRAINER", "TRAINERPLUSTELECALLER"];
  const isStaffLike = (role) => role === "STAFF" || role === "TRAINER" || role === "TRAINERPLUSTELECALLER";
  const [, setAddSelectedIDs] = useState([]);
  const [, setDeleteSelectedIDs] = useState([]);
  const [, setEditBatch] = useState(false);
  const [showInputs, setShowInputs] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [assignmentType, setAssignmentType] = useState("");
  const [contentLoading, setContentLoading] = useState(false);
  const gridRef = useRef(null);
  const attendanceGridApiRef = useRef(null);

  const [leftGridApi, setLeftGridApi] = useState(null);
  const [rightGridApi, setRightGridApi] = useState(null);

  const [, setLeftData] = useState([]);
  const [, setRightData] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [assessmentEditRows, setAssessmentEditRows] = useState([]);
  const [weightValidationError, setWeightValidationError] = useState(null);
  const [currentPostWeightTotal, setCurrentPostWeightTotal] = useState(0);
  const [programOptions, setProgramOptions] = useState([]);
  const [certificationEligibilityOptions, setCertificationEligibilityOptions] = useState([]);
  const [completionStatusOptions, setCompletionStatusOptions] = useState([]);
  const [batchStatusDerivedRules, setBatchStatusDerivedRules] = useState(() => mergeBatchStatusDerivedRules(null));
  const [editAttendanceData, setEditAttendanceData] = useState(null);

  const [announcement, setAnnouncement] = useState("");

  const handleLeftGridEsc = (params) => {
    if (params.event.key === "Escape") {
      document.getElementById("skip-unassigned")?.focus();
    }
  };

  const handleRightGridEsc = (params) => {
    if (params.event.key === "Escape") {
      document.getElementById("skip-current-batch")?.focus();
    }
  };

  const handleBatchStatusExport = useCallback(async () => {
    await generateBatchStatusReport(id, batchName, courseName);
  }, [id, batchName, courseName]);

  // Defer helper to avoid synchronous updates during render
  const defer = (fn) => (typeof queueMicrotask === "function" ? queueMicrotask(fn) : Promise.resolve().then(fn));

  const onAttendanceCellValueChanged = (event) => {
    // Convert the display value back to P/A/H/X/D if needed
    let value = event.newValue;
    const VALUE_MAPPER = {
      Present: "Present",
      Absent: "Absent",
      "Half-day": "Half-day",
      Cancelled: "Cancelled",
      Dropout: "Dropout",
    };
    const NUM_MAPPER = { Present: 1, Absent: 0, "Half-day": 4, Cancelled: 2, Dropout: 3 };
    const CODE_TO_NUM = NUM_MAPPER;

    // Check if the value needs to be converted
    if (VALUE_MAPPER[value]) {
      value = VALUE_MAPPER[value];
    }

    const validCodes = ["Present", "Absent", "Half-day", "Cancelled", "Dropout"];
    if (!validCodes.includes(value)) {
      console.error(`[Attendance Cell Changed] Invalid value: "${value}"`);
      return;
    }
    // Check if the value actually changed
    const oldValueConverted = VALUE_MAPPER[event.oldValue] || event.oldValue;
    if (oldValueConverted === value) return;

    const oldCode = oldValueConverted;

    // ---------- optimistic update (UI immediately reflected) ----------
    const field = event.colDef.field; // date key
    const node = event.node;
    node.setDataValue(field, value); // immediately change the grid cell
    // update attendance data
    setAttendanceData((prev) => prev.map((row) => (row.id === event.data.id ? { ...row, [field]: value } : row)));

    setContentLoading(true);

    // Defer API trigger and show confirmation before persisting any attendance change
    defer(() => {
      const labelOld = toLabel(oldCode);
      const labelNew = toLabel(value);
      let msg = `Do you want to save this attendance change?\n\n${event.data.name}, ${dateFormatter.format(new Date(parseDateFromDateInput(field)))}: ${labelOld} → ${labelNew}`;
      if (value === "Dropout") msg += "\n\nThis will mark the student as dropped out and all subsequent classes.";
      // this is checked in the AttendanceHeaderWithCancel component's onCancel button logic, so if it's
      // an X, we know it's been confirmed by the user already
      var confirmed;
      if (value === "Cancelled") confirmed = true;
      else confirmed = window.confirm(msg);

      if (!confirmed) {
        try {
          if (field) node.setDataValue(field, oldCode);
          setAttendanceData((prev) =>
            prev.map((row) => (row.id === event.data.id ? { ...row, [field]: oldCode } : row))
          );
        } catch (err) {
          console.warn("Could not revert attendance cell", err);
        }
        setContentLoading(false);
        return;
      }
      try {
        const rawField = event.colDef.field;
        const sendDate =
          typeof rawField === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawField)
            ? rawField
            : normalizeDateString(rawField);
        const attendanceData = {
          batchId: id,
          studentId: event.data.id,
          date: sendDate,
          value: CODE_TO_NUM[value] ?? value,
        };
        setEditAttendanceData(attendanceData);
      } catch (e) {
        console.error("[attendance PATCH] prepare error", e);
        setContentLoading(false);
      }
    });
  };

  useEffect(() => {
    const saveStudentData = async () => {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const response = await fetch(`${base}/api/patchattendance`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editAttendanceData),
      });
      // Debug log: response payload
      let raw = "";
      try {
        raw = await response.text();
      } catch {}
      let parsedBody = null;
      try {
        parsedBody = raw ? JSON.parse(raw) : null;
      } catch {}
      if (response.ok) {
        await getBatchData();
        // Wait a bit for React to process state updates before refreshing grid
        setTimeout(() => {
          try {
            // Refresh attendance grid if available
            if (attendanceGridApiRef.current) {
              attendanceGridApiRef.current.refreshCells({ force: true });
            }
            // Also try gridRef as fallback
            if (gridRef.current?.api) {
              gridRef.current.api.refreshCells({ force: true });
            }
          } catch (error) {
            console.error("Error refreshing grid:", error);
          }
        }, 100);
        setMessage(`Attendance was updated!`);
        setAlertSeverity("success");
        setAlertOpen(true);
        setEditAttendanceData(null);
      } else {
        console.error("Error updating the attendance data", response.status, parsedBody ?? raw);
      }
      setContentLoading(false);
    };
    if (editAttendanceData) {
      saveStudentData();
    }
  }, [editAttendanceData]);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await fetch("/api/getcoursesdata");
        const data = await res.json();
        // const options = data?.courses?.map(course => course.course) || [];
        const options = ["Select", ...(data?.courses?.map((course) => course.course) || [])];
        setProgramOptions(options);
      } catch (error) {
        console.error("Failed to fetch course data", error);
      }
    };

    fetchPrograms();
  }, []);

  useEffect(() => {
    const mapOptionValues = (data) =>
      Array.isArray(data?.options)
        ? data.options.map((o) => (typeof o?.value === "string" ? o.value : "")).filter(Boolean)
        : [];

    const fetchBatchStatusDropdowns = async () => {
      try {
        const [certRes, compRes] = await Promise.all([
          fetch("/api/configurations/dropdownOptions?key=certification_eligibility"),
          fetch("/api/configurations/dropdownOptions?key=completion_status"),
        ]);
        if (certRes.ok) {
          setCertificationEligibilityOptions(mapOptionValues(await certRes.json()));
        } else {
          setCertificationEligibilityOptions([]);
        }
        if (compRes.ok) {
          setCompletionStatusOptions(mapOptionValues(await compRes.json()));
        } else {
          setCompletionStatusOptions([]);
        }
      } catch (error) {
        console.error("Failed to fetch batch status dropdown options", error);
        setCertificationEligibilityOptions([]);
        setCompletionStatusOptions([]);
      }
    };

    fetchBatchStatusDropdowns();
  }, []);

  useEffect(() => {
    if (!courseName) return;
    const fetchBatchStatusRules = async () => {
      try {
        const res = await fetch(`/api/configurations/batchStatusRules?course=${encodeURIComponent(courseName)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.rules) setBatchStatusDerivedRules(data.rules);
      } catch (error) {
        console.error("Failed to fetch batch status derived rules", error);
      }
    };

    fetchBatchStatusRules();
  }, [courseName]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sortedData = useCallback(
    () => sortTable("assignment_type", generateBatchAssessmentsData(), true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [batchData]
  );

  // Give focus to first button on mount (Batch Attendance)
  const buttonRef = useRef(null);
  useEffect(() => {
    if (buttonRef.current) {
      buttonRef.current.focus();
    }
  }, []);

  const onLeftGridReady = (params) => {
    setLeftGridApi(params.api);
    setLeftData(unassignedStudents);
  };

  // Normalize a date-like value to YYYY-MM-DD

  const onRightGridReady = (params) => {
    setRightGridApi(params.api);
    setRightData(batchData.students);
  };

  const moveToRight = useCallback(() => {
    if (!leftGridApi) return;
    const selectedRows = leftGridApi.getSelectedRows();

    // If no rows selected, announce that to screen reader and exit function
    if (selectedRows.length === 0) {
      setAnnouncement("");
      setTimeout(() => {
        setAnnouncement("Action not performed, no students selected to add to batch.");
      }, 50);
      return;
    }

    var studentIds = selectedRows.map((student) => student.id);
    const count = selectedRows.length;
    addStudentMulti(studentIds);
    leftGridApi.deselectAll();

    // Accessibility announcement
    const message = count === 1 ? `${selectedRows[0].name} added to batch` : `${count} students added to batch`;

    // force re-read even if same message
    setAnnouncement("");
    setTimeout(() => setAnnouncement(message), 50);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftGridApi]);

  const moveToLeft = useCallback(() => {
    if (!rightGridApi) return;
    const selectedRows = rightGridApi.getSelectedRows();

    // If no rows selected, announce that to screen reader and exit function
    if (selectedRows.length === 0) {
      setAnnouncement("");
      setTimeout(() => {
        setAnnouncement("Action not performed. No students selected to remove from batch.");
      }, 50);
      return;
    }

    var studentIds = selectedRows.map((student) => student.id);
    const count = selectedRows.length;
    deleteStudentMulti(studentIds);
    rightGridApi.deselectAll();

    // Accessibility announcement
    const message = count === 1 ? `${selectedRows[0].name} removed from batch` : `${count} students removed from batch`;

    setAnnouncement("");
    setTimeout(() => setAnnouncement(message), 50);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightGridApi]);

  const handleAssignmentTypeChange = (event) => {
    const v = event.target.value;
    setAssignmentType(v);
    setShowInputs(v === "Post");
  };

  const deleteAssignment = async (assignmentName) => {
    if (assignmentName === "") {
      return;
    }
    setContentLoading(true);
    try {
      const response = await fetch("/api/deleteassignment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ batchId: id, assignmentName }),
      });
      if (response.ok) {
        await getBatchData();
        setAssessmentEditRows([]);
      } else {
        console.error("Error deleting the assignment");
        setMessage("Error deleting the assignment");
        setAlertSeverity("error");
        setAlertOpen(true);
      }
    } finally {
      setContentLoading(false);
    }
  };

  const onGridReady = useCallback((params) => {
    gridApiRef.current = params.api;
    sortedData();
    getBatchData();
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAssessmentFormSubmit = (e) => {
    e?.preventDefault?.();
    addAssignment(id);
  };

  // SHOW A VIEW, DEPENDING ON WHICH BUTTON IS CLICKED
  const batchPageLayoutHandler = (e) => {
    const { name } = e.target;

    // Logic to prompt user if there are any unsaved changes i.e they are in the edit mode
    const editMode = localStorage.getItem("editMode");

    // Check if the user is clicking on the same tab he already is in
    const isSameComponent =
      (name === "assessments" && showAssessments) ||
      (name === "attendance" && showAttendance) ||
      (name === "documents" && showDocuments) ||
      (name === "grades" && showGrades) ||
      (name === "batchstatus" && showBatchStatus) ||
      (name === "management" && showManagement);

    // If edit mode is on and user tries to go to a different component show the prompt
    if (editMode === "true" && !isSameComponent) {
      if (
        confirm(
          "You have unsaved changes, click on OK to go back and save them. If you click cancel the changes will be lost."
        ) == true
      ) {
        return;
      } else {
        localStorage.setItem("editMode", "false");
      }
    }

    setShowAttendance(false);
    setShowGrades(false);
    setShowBatchStatus(false);
    setShowManagement(false);
    setShowDocuments(false);
    setShowAssessments(false);
    switch (name) {
      case "attendance":
        setShowAttendance(true);
        setCurrentPanel(0);
        break;
      case "grades":
        setShowGrades(true);
        setCurrentPanel(1);
        break;
      case "management":
        setShowManagement(true);
        // setCurrentPanel(2);
        setCurrentPanel(5);
        break;
      case "documents":
        setShowDocuments(true);
        // setCurrentPanel(3);
        setCurrentPanel(4);
        break;
      case "assessments":
        setShowAssessments(true);
        // setCurrentPanel(4);
        setCurrentPanel(6);
        break;
      case "batchstatus":
        setShowBatchStatus(true);
        setCurrentPanel(2);
        break;
      default:
        setShowAttendance(true);
        setCurrentPanel(0);
        break;
    }
  };

  function getStudentRecordById(data, id) {
    for (var i in data) {
      if (data[i].id == id) {
        return data[i];
      }
    }
  }

  function getCourseNameById(data, id) {
    for (var i in data) {
      if (data[i].id == id) {
        return data[i].coursename;
      }
    }
  }
  const handleSave = async () => {
    // Use assessmentEditRows when editing so the API gets the latest values (grid can be stale)
    let currentRows = [];
    if (isEditing && assessmentEditRows.length > 0) {
      currentRows = assessmentEditRows.map((r) => ({ ...r }));
    } else if (gridApiRef.current) {
      gridApiRef.current.forEachNode((node) => {
        if (node?.data) {
          currentRows.push({ ...node.data });
        }
      });
    }
    const postRows = currentRows.filter((row) => row.assignment_type === "Post");
    const totalWeight = postRows.reduce((sum, row) => sum + (parseInt(row.assignment_weight, 10) || 0), 0);
    if (totalWeight !== 100) {
      const msg =
        totalWeight > 100
          ? `Total weight cannot exceed 100. Current total: ${totalWeight}%.`
          : `Total weight must equal 100%. Current total: ${totalWeight}%.`;
      setWeightValidationError(msg);
      setMessage(msg);
      setAlertSeverity("error");
      setAlertOpen(true);
      return;
    }
    setWeightValidationError(null);
    setConfirmModalTitle("Save assessment changes");
    setConfirmModalMessage("Save weight and max marks changes? Post weights must total 100%.");
    setConfirmModalConfirmColor("primary");
    confirmModalConfirmRef.current = async () => {
      setContentLoading(true);
      try {
        for (const row of currentRows) {
          const ok = await postAssignmentUpdate(row);
          if (!ok) return;
        }
        setUpdateData([]);
        setAssessmentEditRows([]);
        setEditingColumn(null);
        setIsEditing(false);
        setMessage("Assessment changes saved successfully.");
        setAlertSeverity("success");
        setAlertOpen(true);
        await getBatchData();
      } finally {
        setContentLoading(false);
      }
    };
    confirmModalCancelRef.current = null;
    setConfirmModalOpen(true);
  };

  const handleCancel = async () => {
    setWeightValidationError(null);
    setUpdateData([]);
    setAssessmentEditRows([]);
    setChangesRef(false);
    setEditingColumn(null);
    setIsEditing(false);
    await getBatchData();
  };

  const handleRefreshTable = async () => {
    setAssessmentEditRows([]);
    await getBatchData();
  };

  const handleConfirmModalConfirm = () => {
    confirmModalConfirmRef.current?.();
    confirmModalConfirmRef.current = null;
    confirmModalCancelRef.current = null;
    setConfirmModalOpen(false);
  };

  const handleConfirmModalClose = () => {
    confirmModalCancelRef.current?.();
    confirmModalConfirmRef.current = null;
    confirmModalCancelRef.current = null;
    setConfirmModalOpen(false);
  };

  // Universal keyboard handler for buttons - handles both Enter and Space keys
  const handleKeyDown = (event, action) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault(); // Prevent default behavior
      action(event);
    }
  };

  // Helper function to create consistent button props with accessibility
  const createAccessibleButtonProps = (onClickHandler) => ({
    onClick: onClickHandler,
    onKeyDown: (e) => handleKeyDown(e, onClickHandler),
  });

  const handleEdit = () => {
    setWeightValidationError(null);
    if (gridApiRef.current) {
      const currentData = [];
      gridApiRef.current.forEachNode((node) => {
        if (node.data) {
          currentData.push({ ...node.data });
        }
      });
      originalDataRef.current = currentData;
      const rows = currentData.length > 0 ? currentData : sortedData();
      setAssessmentEditRows(rows);
      const postTotal = rows
        .filter((r) => r.assignment_type === "Post")
        .reduce((sum, r) => sum + (parseInt(r.assignment_weight, 10) || 0), 0);
      setCurrentPostWeightTotal(postTotal);
    } else {
      const rows = sortedData();
      setAssessmentEditRows(rows);
      const postTotal = rows
        .filter((r) => r.assignment_type === "Post")
        .reduce((sum, r) => sum + (parseInt(r.assignment_weight, 10) || 0), 0);
      setCurrentPostWeightTotal(postTotal);
    }
    setIsEditing(true);
    setEditingColumn("assignment_weight");
  };

  /* ---------------------------------- API SECTION -----------------------------------*/
  const fetchUnassignedStudents = async (batchId) => {
    setContentLoading(true);
    const base = typeof window !== "undefined" ? window.location.origin : "";

    try {
      // Parallel API calls instead of sequential for better performance
      const [studentApiResponse, batchesApiResponse, unassignedResponse] = await Promise.all([
        fetch(`${base}/api/getstudentsdata`),
        fetch(`${base}/api/getbatchesdata`),
        fetch(`${base}/api/getunassignedstudents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batch_id: batchId,
          }),
        }),
      ]);

      // Check if responses are OK and have JSON content
      if (!studentApiResponse.ok) {
        const contentType = studentApiResponse.headers.get("content-type");
        let errorText = `Failed to fetch students: ${studentApiResponse.status}`;
        if (contentType?.includes("application/json")) {
          try {
            const errorData = await studentApiResponse.json();
            errorText = errorData.error || errorData.message || errorText;
          } catch (e) {
            // Ignore JSON parse errors
          }
        } else {
          try {
            const text = await studentApiResponse.text();
            errorText = `${errorText}. Response: ${text.substring(0, 200)}`;
          } catch (e) {
            // Ignore text read errors
          }
        }
        throw new Error(errorText);
      }
      if (!batchesApiResponse.ok) {
        const contentType = batchesApiResponse.headers.get("content-type");
        let errorText = `Failed to fetch batches: ${batchesApiResponse.status}`;
        if (contentType?.includes("application/json")) {
          try {
            const errorData = await batchesApiResponse.json();
            errorText = errorData.error || errorData.message || errorText;
          } catch (e) {
            // Ignore JSON parse errors
          }
        } else {
          try {
            const text = await batchesApiResponse.text();
            errorText = `${errorText}. Response: ${text.substring(0, 200)}`;
          } catch (e) {
            // Ignore text read errors
          }
        }
        throw new Error(errorText);
      }
      if (!unassignedResponse.ok) {
        const contentType = unassignedResponse.headers.get("content-type");
        let errorText = `Failed to fetch unassigned students: ${unassignedResponse.status}`;
        if (contentType?.includes("application/json")) {
          try {
            const errorData = await unassignedResponse.json();
            errorText = errorData.error || errorData.message || errorText;
            if (errorData.details) {
              errorText = `${errorText}. Details: ${errorData.details.substring(0, 200)}`;
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        } else {
          try {
            const text = await unassignedResponse.text();
            errorText = `${errorText}. Response: ${text.substring(0, 200)}`;
          } catch (e) {
            // Ignore text read errors
          }
        }
        throw new Error(errorText);
      }

      // Check Content-Type before parsing JSON
      const studentContentType = studentApiResponse.headers.get("content-type");
      const batchesContentType = batchesApiResponse.headers.get("content-type");
      const unassignedContentType = unassignedResponse.headers.get("content-type");

      if (!studentContentType?.includes("application/json")) {
        const text = await studentApiResponse.text();
        throw new Error(`Expected JSON but got ${studentContentType}. Response: ${text.substring(0, 100)}`);
      }
      if (!batchesContentType?.includes("application/json")) {
        const text = await batchesApiResponse.text();
        throw new Error(`Expected JSON but got ${batchesContentType}. Response: ${text.substring(0, 100)}`);
      }
      if (!unassignedContentType?.includes("application/json")) {
        const text = await unassignedResponse.text();
        throw new Error(`Expected JSON but got ${unassignedContentType}. Response: ${text.substring(0, 100)}`);
      }

      const [studentRes, batchesRes, unassignedData] = await Promise.all([
        studentApiResponse.json(),
        batchesApiResponse.json(),
        unassignedResponse.json(),
      ]);

      const data = unassignedData;
      var studentList = [];
      data.students?.forEach((student) => {
        const record = getStudentRecordById(studentRes.students, student.id);
        const course = getCourseNameById(batchesRes.batches, batchId);
        if (
          !toggleUnassignedStudents ||
          [record.first_choice, record.second_choice, record.third_choice].includes(course)
        ) {
          student = {
            ...student,
            first_choice: record.first_choice,
            second_choice: record.second_choice,
            third_choice: record.third_choice,
          };
          studentList.push(student);
        }
      });
      setUnassignedStudents(studentList);
      origUnassignedStudents.current = studentList;
    } catch (error) {
      console.error("Error fetching unassigned students:", error);
      setUnassignedStudents([]);
      origUnassignedStudents.current = [];
    } finally {
      setContentLoading(false);
    }
  };
  useEffect(() => {
    if (toggleUnassignedStudents !== null) {
      // optional guard if you want
      fetchUnassignedStudents(id);
    }
  }, [toggleUnassignedStudents]); // runs when toggle changes

  const handleToggleUnassignedStudents = () => {
    setToggleUnassignedStudents(!toggleUnassignedStudents);
  };

  /* ---------------------------------- API SECTION -----------------------------------*/
  const updateDocumentsFee = async ({ data }) => {
    setContentLoading(true);
    const apiUrlEndpoint = `/api/updatedocumentsfee`;
    const toYesNoEnum = (v) => {
      const s = String(v ?? "")
        .trim()
        .toLowerCase();
      if (s === "yes" || s === "1" || s === "true") return "yes";
      if (s === "no" || s === "0" || s === "false") return "no";
      return "no";
    };
    const payload = {
      ...data,
      id_proof: toYesNoEnum(data.id_proof),
      disability_cert: toYesNoEnum(data.disability_cert),
      photo: toYesNoEnum(data.photo),
      bank_details: toYesNoEnum(data.bank_details),
    };
    const postData = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: id, studentData: payload }),
      // body: JSON.stringify({ batchId: id, studentId: data })
    };
    const response = await fetch(apiUrlEndpoint, postData);
    if (response.ok) {
      getBatchDocumentData();
    } else {
      console.error("Error updating documents and fees");
    }
    setContentLoading(false);
  };

  /* ---------------------------------- API SECTION -----------------------------------*/
  const postAssignmentUpdate = async (assignmentData) => {
    const rowIdentifier = assignmentData.id ?? assignmentData.assignment_name;
    if (!rowIdentifier) {
      setMessage("Cannot update assessment: missing row identifier.");
      setAlertSeverity("error");
      setAlertOpen(true);
      return false;
    }
    const payload = { ...assignmentData, id: rowIdentifier };
    const apiUrlEndpoint = `/api/updateassignment`;
    const postData = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: id, assignmentData: payload }),
    };
    try {
      const response = await fetch(apiUrlEndpoint, postData);
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.success !== false) {
        return true;
      }
      const serverMessage = result.message || response.statusText || "";
      setMessage(
        serverMessage
          ? `Failed to update assessment. ${serverMessage}`
          : "Failed to update assessment. Please try again."
      );
      setAlertSeverity("error");
      setAlertOpen(true);
      return false;
    } catch (err) {
      console.error("Error updating the assignment", err);
      setMessage("Failed to update assessment. Please try again.");
      setAlertSeverity("error");
      setAlertOpen(true);
      return false;
    }
  };

  const updateAssignment = async (assignmentData) => {
    const rowIdentifier = assignmentData.id ?? assignmentData.assignment_name;
    if (!rowIdentifier) {
      setMessage("Cannot update assessment: missing row identifier.");
      setAlertSeverity("error");
      setAlertOpen(true);
      setContentLoading(false);
      return false;
    }
    const payload = { ...assignmentData, id: rowIdentifier };
    setContentLoading(true);
    try {
      const ok = await postAssignmentUpdate(assignmentData);
      if (!ok) return false;
      if (batchData?.grades) {
        const updatedGrades = batchData.grades.map((grade) => {
          if (grade.assignment_name === rowIdentifier) {
            return {
              ...grade,
              assignment_name: payload.assignment_name,
              assignment_type: payload.assignment_type,
              assignment_weight: payload.assignment_weight,
              max_marks: payload.max_marks,
            };
          }
          return grade;
        });
        skipNextAssignmentTypeChangeRef.current = true;
        setBatchData({ ...batchData, grades: updatedGrades });
      }
      setAssessmentEditRows([]);
      setMessage(`Assignment information was updated!`);
      setAlertSeverity("success");
      setAlertOpen(true);
      await getBatchData();
      return true;
    } finally {
      setLoading(false);
      setContentLoading(false);
    }
  };

  const onCellValueChanged = useCallback((event) => {
    if (event.column.colId === "max_marks") {
      if (skipNextMaxMarksChangeRef.current) {
        skipNextMaxMarksChangeRef.current = false;
        return;
      }
      const raw = event.newValue;
      const parsed = raw === "" || raw == null ? NaN : parseInt(raw, 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        skipNextMaxMarksChangeRef.current = true;
        event.node.setDataValue("max_marks", event.oldValue);
        setLoading(false);
        setContentLoading(false);
        return;
      }
      const rowData = { ...event.data, max_marks: parsed };
      setUpdateData((prev) => {
        const idx = prev.findIndex((a) => a.assignment_name === event.data.assignment_name);
        const next = idx >= 0 ? [...prev.slice(0, idx), rowData, ...prev.slice(idx + 1)] : [...prev, rowData];
        return next;
      });
      setAssessmentEditRows((prev) => {
        let source = [];
        if (gridApiRef.current) {
          gridApiRef.current.forEachNode((node) => node?.data && source.push({ ...node.data }));
        }
        if (source.length === 0) source = prev.length > 0 ? prev : sortedData();
        return source.map((row) => (row.assignment_name === event.data.assignment_name ? { ...rowData } : { ...row }));
      });
      if (gridApiRef.current) {
        const rows = [];
        gridApiRef.current.forEachNode((node) => node?.data && rows.push({ ...node.data }));
        const postRows = rows.filter((r) => r.assignment_type === "Post");
        const total = postRows.reduce((sum, r) => sum + (parseInt(r.assignment_weight, 10) || 0), 0);
        setCurrentPostWeightTotal(total);
        if (total > 100) {
          setWeightValidationError(`Total weight cannot exceed 100. Current total: ${total}%.`);
        } else if (total < 100) {
          setWeightValidationError(`Total weight must equal 100. Current total: ${total}%.`);
        } else {
          setWeightValidationError(null);
        }
      }
      setLoading(false);
      setContentLoading(false);
      return;
    } else {
      // When switching away from Post, clear weight so it doesn't show
      const rowData = { ...event.data };
      if (event.column.colId === "assignment_type") {
        // Ignore spurious cell value change when grid applies new rowData after a successful save (prevents infinite loop)
        if (skipNextAssignmentTypeChangeRef.current) {
          skipNextAssignmentTypeChangeRef.current = false;
          setLoading(false);
          setContentLoading(false);
          return;
        }
        rowData.assignment_type = event.newValue;
        if (event.newValue !== "Post") {
          rowData.assignment_weight = 0;
          event.node.setDataValue("assignment_weight", 0);
        }
      } else if (event.column.colId === "assignment_weight") {
        // Use event.newValue so the edited row keeps the new weight (event.data can be stale)
        const w = event.newValue;
        const newWeight = w === "" || w == null ? 0 : parseInt(w, 10) || 0;
        rowData.assignment_weight = newWeight;
        // Before accepting: check that cumulative total would not exceed 100
        if (gridApiRef.current) {
          let wouldBeTotal = 0;
          gridApiRef.current.forEachNode((node) => {
            if (!node?.data || node.data.assignment_type !== "Post") return;
            const rowWeight =
              node.data.assignment_name === event.data.assignment_name
                ? newWeight
                : parseInt(node.data.assignment_weight, 10) || 0;
            wouldBeTotal += rowWeight;
          });
          if (wouldBeTotal > 100) {
            event.node.setDataValue("assignment_weight", event.oldValue);
            const msg = `Total weight cannot exceed 100. Would be ${wouldBeTotal}%.`;
            setWeightValidationError(msg);
            setMessage(msg);
            setAlertSeverity("error");
            setAlertOpen(true);
            setCurrentPostWeightTotal(wouldBeTotal);
            setLoading(false);
            setContentLoading(false);
            return;
          }
        }
      }
      setUpdateData((prev) => {
        const idx = prev.findIndex((a) => a.assignment_name === event.data.assignment_name);
        const next = idx >= 0 ? [...prev.slice(0, idx), rowData, ...prev.slice(idx + 1)] : [...prev, rowData];
        return next;
      });
      // Keep row data in sync: prefer current grid data so multiple edits don't revert (event.data can be stale)
      setAssessmentEditRows((prev) => {
        let source = [];
        if (gridApiRef.current) {
          gridApiRef.current.forEachNode((node) => node?.data && source.push({ ...node.data }));
        }
        if (source.length === 0) source = prev.length > 0 ? prev : sortedData();
        return source.map((row) => (row.assignment_name === event.data.assignment_name ? { ...rowData } : { ...row }));
      });
      // Update weight validation and cumulative total from current grid (must equal 100 for Post weights)
      if (gridApiRef.current) {
        const rows = [];
        gridApiRef.current.forEachNode((node) => node?.data && rows.push({ ...node.data }));
        const postRows = rows.filter((r) => r.assignment_type === "Post");
        const total = postRows.reduce((sum, r) => sum + (parseInt(r.assignment_weight, 10) || 0), 0);
        setCurrentPostWeightTotal(total);
        if (total > 100) {
          setWeightValidationError(`Total weight cannot exceed 100. Current total: ${total}%.`);
        } else if (total < 100) {
          setWeightValidationError(`Total weight must equal 100. Current total: ${total}%.`);
        } else {
          setWeightValidationError(null);
        }
      }
      // Keep assessment changes local in edit mode; Save/Cancel controls persistence.
      setLoading(false);
      setContentLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------- API SECTION -----------------------------------*/
  const addStudent = async (studentId) => {
    if (!studentId) return;
    setContentLoading(true);
    const apiUrlEndpoint = `/api/addstudenttobatch`;
    const postData = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, batchId: id }),
    };
    const response = await fetch(apiUrlEndpoint, postData);
    const result = await response.json();
    if (result.success) {
      fetchUnassignedStudents(id);
      getBatchData();
    } else {
      console.error("Error adding student to batch");
    }
    setContentLoading(false);
  };

  const addStudentMulti = async (students) => {
    students.forEach((studentId) => {
      addStudent(studentId);
    });
    setAddSelectedIDs([]);
    setDeleteSelectedIDs([]);
  };

  /* ---------------------------------- API SECTION -----------------------------------*/
  const deleteStudent = async (studentId) => {
    if (!studentId) return;
    setContentLoading(true);
    const apiUrlEndpoint = `/api/deletestudentfrombatch`;
    const postData = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, batchId: id }),
    };
    const response = await fetch(apiUrlEndpoint, postData);
    const result = await response.json();
    if (result.success) {
      fetchUnassignedStudents(id);
      getBatchData();
    } else {
      console.error("Error adding student to batch");
    }
    setContentLoading(false);
  };

  const deleteStudentMulti = async (students) => {
    students.forEach((studentId) => {
      deleteStudent(studentId);
    });
    setAddSelectedIDs([]);
    setDeleteSelectedIDs([]);
    setEditBatch(false);
  };

  const cellRenderer = (params) => {
    const { colDef, data, value, valueFormatted } = params;
    const fieldName = colDef.headerName ?? colDef.field;
    const personName = data.name;
    const display = valueFormatted ?? value;
    return (
      <div role="gridcell" aria-label={`${personName}'s ${fieldName}: ${display}`}>
        {display}
      </div>
    );
  };

  /* ---------------------------------- API SECTION -----------------------------------*/
  const addAssignment = async (batch_id) => {
    const form = document.getElementById("create-assessment-form");
    if (form && !form.reportValidity()) {
      return;
    }
    // Use grid's current data when available so type changes (e.g. Post → Formative) are reflected
    const sourceAssessments = assessmentEditRows.length > 0 ? assessmentEditRows : assessmentsData;
    const currentAssessments = sourceAssessments.map((assessment) => assessment.id ?? assessment.assignment_name);
    const assignment_name = document.getElementById("assignment_name").value;
    const assignmentTypeInput = document.querySelector('input[name="assignment_type"]:checked');
    const assignment_type = assignmentTypeInput?.value || "Post";
    const max_marks = document.getElementById("max_marks").value;
    var total_weight = 0;
    for (let i = 0; i < sourceAssessments.length; i++) {
      const a = sourceAssessments[i];
      if (a.assignment_type === "Post") {
        total_weight += parseInt(a.assignment_weight, 10) || 0;
      }
    }
    var assignment_weight = 0;
    if (assignment_type === "Post") {
      const weightInput = document.getElementById("assignment_weight");
      const formWeight =
        weightInput && weightInput.value !== "" && weightInput.value != null ? parseInt(weightInput.value, 10) : NaN;
      assignment_weight = !Number.isNaN(formWeight) ? Math.max(0, formWeight) : Math.max(0, 100 - total_weight);
    }

    if (currentAssessments.includes(assignment_name)) {
      setMessage("Assessment already exists, please use a different name");
      setAlertSeverity("error");
      setAlertOpen(true);
      setContentLoading(false);
    } else if (assignment_type === "Post" && total_weight + assignment_weight > 100) {
      setMessage(
        "Total weight of Post assessments cannot exceed 100%. Current total is " +
          total_weight +
          "%. Reduce the new assessment weight or adjust existing weights using Edit."
      );
      setAlertSeverity("error");
      setAlertOpen(true);
    } else {
      setContentLoading(true);
      // const apiUrlEndpoint = `https://va-stats.vercel.app/api/addassignment`;
      const apiUrlEndpoint = `/api/addassignment`;
      const postData = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_id,
          assignment_name,
          assignment_type,
          assignment_weight,
          max_marks,
        }),
      };
      const response = await fetch(apiUrlEndpoint, postData);
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.success !== false) {
        setAssessmentEditRows([]);
        setShowForm(false);
        await getBatchData();
        setMessage("Assessment added successfully.");
        setAlertSeverity("success");
        setAlertOpen(true);
      } else {
        console.error("Error adding assignment", result.message || response.statusText);
        const serverMessage = result.message || response.statusText || "";
        setMessage(
          serverMessage ? `Failed to add assessment. ${serverMessage}` : "Failed to add assessment. Please try again."
        );
        setAlertSeverity("error");
        setAlertOpen(true);
      }
      setContentLoading(false);
    }
  };

  /* ---------------------------------- API SECTION -----------------------------------*/
  const getUserData = async () => {
    if (!session?.user?.email) return;
    setContentLoading(true);
    const apiUrlEndpoint = `/api/getuserdata`;
    const postData = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: getUserEmail(session),
      }),
    };
    const response = await fetch(apiUrlEndpoint, postData);
    const res = await response.json();
    setUserResponse(res.users?.[0] ?? {});
    setLoading(false);
    setContentLoading(false);
  };

  // Added initial call to the batches API
  useEffect(() => {
    if (didInitRef.current) return;
    if (!id || !session?.user?.email) return;
    didInitRef.current = true;
    (async () => {
      // Parallel API calls for better performance
      await Promise.all([getUserData(), getBatchData(), getBatchDocumentData(), fetchUnassignedStudents(id)]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, id]);

  // If prerequisites aren't ready, avoid getting stuck in loading state
  useEffect(() => {
    if (!session?.user?.email || !id) {
      setLoading(false);
    }
  }, [session, id]);

  /* ---------------------------------- API SECTION -----------------------------------*/
  const getBatchData = async () => {
    if (!id) return;
    setContentLoading(true);
    const apiUrlEndpoint = `/api/getbatchdetails`;
    var postData = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batch_id: id,
      }),
    };
    var response = await fetch(apiUrlEndpoint, postData);
    var data = await response.json();
    const safeStudents = Array.isArray(data?.students) ? data.students : [];
    setBatchData(data || {});
    setCourseName(data?.coursename || "");
    setBatchName(data?.batch || "");
    setBatchLength(safeStudents.length);
    setBatchTotalAmount(documentsData["total_amount"]);
    setBatchAmount1(documentsData["total_amount_1"]);
    setBatchAmount2(documentsData["total_amount_2"]);
    setBatchAmount3(documentsData["total_amount_3"]);
    setBatchCurrency(data?.currency || "NA");
    setLoading(false);
    setContentLoading(false);
  };

  /* ---------------------------------- API SECTION -----------------------------------*/
  const generateBatchAssessmentsData = () => {
    let res = [];

    const firstStudentId = batchData?.students?.[0]?.id;

    if (!firstStudentId) {
      return res;
    }

    let studentGrade = batchData.grades.filter((grade) => grade.student_id === firstStudentId);

    if (studentGrade.length === 0) {
      studentGrade = batchData.grades;
    }

    studentGrade.forEach((grade) => {
      const assessmentData = {
        id: grade.assignment_name,
        assignment_name: grade.assignment_name,
        assignment_type: grade.assignment_type,
        assignment_weight: grade.assignment_weight,
        max_marks: grade.max_marks,
      };

      res.push(assessmentData);
    });

    return res;
  };

  const getBatchDocumentData = async () => {
    const apiUrlEndpoint = `/api/getdocumentsfee`;
    const postData = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batch_id: id,
      }),
    };
    const response = await fetch(apiUrlEndpoint, postData);
    const data = await response.json();
    setBatchDocumentData(data);
    setLoading(false);
  };

  var convertValue = (value) => {
    const mapping = { 1: "Present", 0: "Absent", 4: "Half-day", 2: "Cancelled", 3: "Dropout" };
    return Object.prototype.hasOwnProperty.call(mapping, value) ? mapping[value] : value;
  };

  // Custom header component for the attendance date columns
  // Adds a cancel button to cancel a class for that date
  // Also adds keyboard accessibility so users can cancel a class
  // by pressing Enter or Space when the desired header cell is focused.
  function AttendanceHeaderWithCancel(props) {
    const rootRef = useRef(null);

    const onCancel = () => {
      // get the current column name
      const field = props.column.getColDef().field;
      if (!field) return;

      // Since onAttendanceCellValueChanged already implements logic to cancel
      // all rows and update the database, we'll mimic the original
      // implementation by changing just one not-already-cancelled row to be
      // cancelled, to avoid repeated messages from the
      // onAttendanceCellValueCahnged function. If all rows are already
      // cancelled, then we'll show an alert to indicate that the class is
      // already cancelled.
      let someNotCancelled = false;
      let confirmCancel = true; // default - will go through unless user cancels in the confirmation window

      props.api.forEachNode((node) => {
        if (someNotCancelled || !confirmCancel) return;

        const cellValue = node.data[field];
        if (cellValue !== "Cancelled") {
          someNotCancelled = true;

          confirmCancel = window.confirm(
            `Are you sure you want to cancel the class on ${dateFormatter.format(new Date(parseDateFromDateInput(props.displayName)))}? This will mark all students as "Cancelled" for this date.`
          );
          if (confirmCancel) {
            node.setDataValue(field, "Cancelled");
          }
        }
      });

      if (!someNotCancelled && confirmCancel) {
        alert(
          `Class on ${dateFormatter.format(new Date(parseDateFromDateInput(props.displayName)))} is already cancelled.`
        );
      }
    };

    // Since the button within this custom header is not focusable
    // in AG Grid, then we'll look for the closest parent that has focus instead.
    // This parent with focus has a class name of .ag-header-cell.
    // This allows us to attached a key down event listener to the header
    // cell that actually gets focus when navigating with the keyboard.
    // This then runs the same cancel action as clicking the button, allowing
    // keyboard and mouse users to cancel a class by interacting with the header.
    useEffect(() => {
      if (!rootRef.current) return;

      const headerCell = rootRef.current.closest(".ag-header-cell");

      if (!headerCell) return;

      const handleKeyDown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          // prevents the default behavior of the spacebar (i.e., scrolling down)
          event.preventDefault();
          onCancel();
        }
      };

      // add aria-label to the header cell for screen readers, to indicate that
      // it can be interacted with to cancel the class
      headerCell.setAttribute(
        "aria-label",
        `Press Enter or Space to cancel class on ${dateFormatter.format(new Date(parseDateFromDateInput(props.displayName)))}.`
      );

      headerCell.addEventListener("keydown", handleKeyDown);

      // clean up function that's called on refresh, etc.
      // Note: this is automatically called by React when needed
      return () => {
        headerCell.removeEventListener("keydown", handleKeyDown);
        headerCell.removeAttribute("aria-label");
      };
    }, []);

    return (
      <div className={tableStyles.attendanceHeader}>
        <span>{dateFormatter.format(new Date(parseDateFromDateInput(props.displayName)))}</span>
        <button
          ref={rootRef}
          className={tableStyles.cancelAttendanceButton}
          onClick={() => {
            onCancel();
          }}
          title={`Cancel class for ${dateFormatter.format(new Date(parseDateFromDateInput(props.displayName)))}`}
          // hide the button from the screen reader so that it doesn't read out
          // "Cancel attendance for [date], button" after reading the header
          // name; the cancel action is still accessible via keyboard by focusing
          // on the header cell and pressing Enter or Space
          aria-hidden="true"
        >
          X
        </button>
      </div>
    );
  }

  const generateColumnsFromDate = () => {
    let res = [];
    if (batchData?.attendance) {
      const attendanceDates = new Set();
      batchData.attendance.forEach((attendance) => {
        attendanceDates.add(normalizeDateString(attendance.date));
      });
      const attendanceDatesList = Array.from(attendanceDates).sort();
      const todaysDate = normalizeDateString(new Date());
      attendanceDatesList.forEach((attendanceDate) => {
        res.push({
          field: attendanceDate,
          headerName: attendanceDate,
          // adds a CSS class to highlight the header of an attendance column matching today's date
          headerClass: attendanceDate === todaysDate ? tableStyles.highlightTodayColumnHeaderAttendance : "",
          headerComponent: AttendanceHeaderWithCancel, // add the custom header component
          editable: true,
          sortable: false,
          width: 140,
          cellEditor: AccessibleSelectCellEditor,
          // adds a CSS class to highlight the rows in an attendance column matching today's date
          cellClass: attendanceDate === todaysDate ? tableStyles.highlightTodayColumnCellAttendance : "",
          // Note: AG Grid requires the values to accurately represent what's
          // in the grid (or possible within the grid), so we can't fully
          // remove "Cancelled" from the list of options.
          // Alternatively, we can make it conditional; we'll only show "Cancelled"
          // when the cell contains "Cancelled", otherwise, we'll only show the
          // non-cancelled options.
          cellEditorParams: (params) => {
            const nonCancelledValues = ["Present", "Absent", "Half-day", "Dropout"];

            if (params.value === "Cancelled") {
              return {
                values: ["Cancelled", ...nonCancelledValues],
              };
            }

            return {
              values: nonCancelledValues,
            };
          },
          headerTooltip: `Attendance status for ${dateFormatter.format(new Date(parseDateFromDateInput(attendanceDate)))}`,
          cellRenderer: (params) => {
            let value;

            if (params.value === "Present") {
              if (attendanceDate > todaysDate) {
                value = "-";
              } else {
                value = "Present";
              }
            } else {
              value = toLabel(params.value || "");
            }

            const studentName = params.data?.name || "Unknown Student";
            const readOut = `Student ${studentName}, ${dateFormatter.format(new Date(parseDateFromDateInput(attendanceDate)))}: ${value}`;
            return (
              <div role="gridcell" title={readOut} aria-label={readOut}>
                {value}
              </div>
            );
          },
        });
      });
    }
    res.unshift({
      headerName: "% att.",
      field: "percent",
      width: 80,
      sortable: false,
      headerTooltip: "Attendance percentage for this student",
    });
    res.unshift({
      headerName: "Students",
      field: "name",
      width: 200,
      sortable: true,
      headerTooltip: "Student name for attendance tracking",
      cellRenderer: (params) => {
        return <span role="rowheader">{params.value}</span>;
      },
    });
    return res;
  };

  // Memoized: Calculate which date to show (today or most recent class date)
  const targetAttendanceDate = useMemo(() => {
    const today = new Date();
    const todaysDate = normalizeDateString(today);
    const todayDayOfWeek = today.getDay();
    const courseDays = batchData?.coursedays || "";

    // Check if today is within the course date range
    const startStr = batchData?.coursestart ? normalizeDateString(batchData.coursestart) : null;
    const endStr = batchData?.courseend ? normalizeDateString(batchData.courseend) : null;

    const inRange = startStr && endStr ? todaysDate >= startStr && todaysDate <= endStr : true; // if date information is not available, show today

    const isTodayClassDay = inRange && isClassDay(todayDayOfWeek, courseDays);

    // If today is a class day (within range and correct day of week), show today
    if (isTodayClassDay) {
      return { date: todaysDate, label: todaysDate };
    }

    // Otherwise, find the most recent class date
    // Get unique dates from attendance data
    const attendanceDates = batchData?.attendance
      ? Array.from(new Set(batchData.attendance.map((att) => normalizeDateString(att.date))))
      : null;

    const mostRecentDate = findMostRecentClassDate(
      attendanceDates || undefined,
      batchData?.coursestart,
      batchData?.courseend,
      courseDays
    );

    // If the most recent date is today, show today
    if (mostRecentDate === todaysDate) {
      return { date: todaysDate, label: todaysDate };
    }

    // Otherwise, show the most recent class date with label
    return { date: mostRecentDate, label: `${mostRecentDate} (Most Recent)` };
  }, [
    batchData?.coursedays,
    batchData?.attendance,
    batchData?.coursestart,
    batchData?.courseend,
    isClassDay,
    normalizeDateString,
    findMostRecentClassDate, // Include findMostRecentClassDate to ensure recalculation when function changes
  ]);

  const generateColumnsFromDateStaff = () => {
    let res = [];

    const { date: dateToShow, label: dateLabel } = targetAttendanceDate;

    // Show today's or most recent class date column
    res.push({
      field: dateToShow,
      headerName: dateLabel,
      width: 120,
      editable: (params) => params.data[dateToShow] !== "Dropout" && params.data[dateToShow] !== "Cancelled",
      sortable: false,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: {
        values: ["Present", "Absent", "Half-day"],
        formatter: (val) => toLabel(val),
      },
      valueFormatter: (params) => toLabel(params.value),
      valueParser: (params) => {
        const VALUE_MAPPER = {
          Present: "Present",
          Absent: "Absent",
          "Half-day": "Half-day",
          Cancelled: "Cancelled",
          Dropout: "Dropout",
        };
        return VALUE_MAPPER[params.newValue] || params.newValue;
      },
      headerTooltip: `Attendance status for ${dateLabel}`,
      cellRenderer: (params) => {
        const rawValue = params.value || "";
        const value = toLabel(rawValue);
        const studentName = params.data?.name || "Unknown Student";
        const readOut = `Student ${studentName}, ${dateLabel}: ${value}`;
        return (
          <div role="gridcell" title={readOut} aria-label={readOut}>
            {value}
          </div>
        );
      },
    });
    res.unshift({
      headerName: "Students",
      field: "name",
      width: 200,
      sortable: false,
      headerTooltip: "Student name for attendance tracking",
      cellRenderer: (params) => {
        return <span role="rowheader">{params.value}</span>;
      },
    });
    return res;
  };

  const generateStudentTableData = () => {
    let res = [];
    if (batchData?.students) {
      const { date: dateToShow } = targetAttendanceDate;

      res = batchData.students.map((student) => {
        // Get all attendance for this student (for displaying all dates in admin view)
        let allStudentAttendance = batchData.attendance?.filter((att) => att.student_id === student.id) || [];

        // Filter attendance to only include dates up to today for percentage calculation
        const today = normalizeDateString(new Date());
        let studentAttendanceForCalculation = allStudentAttendance.filter((att) => {
          const dateStr = normalizeDateString(att.date);
          return dateStr <= today;
        });

        const studentData = {
          id: student.id,
          name: student.name,
        };

        // Calculate attendance percentage using only dates up to today
        let present_count = 0;
        let total_count = 0;
        studentAttendanceForCalculation.forEach((attendance) => {
          const value = convertValue(attendance.is_present);
          if (value !== "Cancelled") {
            total_count++;
          }
          if (value === "Present") present_count++;
          if (value === "Half-day") present_count += 0.5;
        });

        // Add all attendance dates to studentData (including future dates for admin view)
        allStudentAttendance.forEach((attendance) => {
          const value = convertValue(attendance.is_present);
          const dateKey = normalizeDateString(attendance.date);
          studentData[dateKey] = value;
        });

        // Ensure the date to show is in studentData (for display)
        if (!(dateToShow in studentData)) {
          studentData[dateToShow] = "";
        }

        studentData.percent = total_count == 0 ? 0 : Math.round((present_count / parseFloat(total_count)) * 100, 2);
        return studentData;
      });
    }
    return res;
  };

  const generateGradeData = () => {
    if (!batchData.students || !batchData.grades) return [];

    return batchData.students.map(({ id, name, grade }) => {
      const studentScores = batchData.grades.reduce(
        (acc, { assignment_name, grade, student_id, assignment_type, assignment_weight, max_marks }) => {
          if (student_id === id) {
            acc[assignment_name] = Math.round(grade);
            if (assignment_type === "Post") {
              acc["Post Assessment"] = (acc["Post Assessment"] || 0) + (grade / max_marks) * assignment_weight;
            }
          }
          return acc;
        },
        { "Post Assessment": 0 }
      );

      const postAssessmentScore = Number(studentScores["Post Assessment"].toFixed(1));

      // Use DB grade if available, otherwise fallback to postAssessmentScore
      var finalGradeValue = grade != null ? Number(grade).toFixed(1) : postAssessmentScore.toFixed(1);
      if (grade != null && finalGradeValue != postAssessmentScore.toFixed(1)) {
        finalGradeValue = postAssessmentScore.toFixed(1);
      }

      return {
        id,
        name,
        finalGrade: `${finalGradeValue}%`,
        ...studentScores,
        "Post Assessment": `${postAssessmentScore.toFixed(1)}%`,
      };
    });
  };

  const generateColumnsFromAssignment = () => {
    let res = [];
    let options = [];

    if (batchData?.grades) {
      const assignmentNames = new Set();
      batchData.grades.forEach((grade) => {
        assignmentNames.add(grade.assignment_name);
      });

      assignmentNames.forEach((assignmentName) => {
        res.push({
          field: assignmentName,
          headerName: assignmentName,
          headerTooltip: `Grade for assignment: ${assignmentName}`,
          cellRenderer: (params) => {
            const value = params.value || "";
            const studentName = params.data?.name || "Unknown Student";
            return <span title={`Student ${studentName}, ${assignmentName}: ${value}`}>{value}</span>;
          },
        });
        options.push(<option value={assignmentName}>{assignmentName}</option>);
      });

      setAssessmentsOptions(options);
    }

    // ✅ DO NOT add "Post Assessment" column to res

    // ✅ Final Grade column
    res.unshift({
      field: "finalGrade",
      headerName: "Final Grade",
      editable: false,
      width: 150,
      sortable: true,
      headerTooltip: "Final grade percentage for this student",
      cellRenderer: (params) => {
        const value = params.value || "";
        const studentName = params.data?.name || "Unknown Student";
        return <span title={`Student ${studentName}, Final Grade: ${value}`}>{value}</span>;
      },
    });

    // ✅ Students column
    res.unshift({
      field: "name",
      headerName: "Students",
      editable: false,
      sortable: true,
      headerTooltip: "Student name for grade tracking",
      cellRenderer: (params) => {
        return <span role="rowheader">{params.value}</span>;
      },
    });

    return res;
  };

  const handleDelete = (props) => {
    const assignmentName = props.data.assignment_name;
    setConfirmModalTitle("Delete assessment");
    setConfirmModalMessage(`Are you sure you want to delete "${assignmentName}"? This cannot be undone.`);
    setConfirmModalConfirmColor("error");
    confirmModalConfirmRef.current = () => deleteAssignment(assignmentName);
    confirmModalCancelRef.current = null;
    setConfirmModalOpen(true);
  };

  const generateBatchAssessmentCols = () => {
    return [
      {
        field: "delete",
        headerName: "",
        maxWidth: 76,
        cellRenderer: (props) => StudentDeleteCell(props, handleDelete),
        editable: false,
        sortable: false,
        filter: false,
        resizable: false,
      },
      {
        field: "assignment_name",
        headerName: "NAME",
        editable: false,
      },
      {
        field: "assignment_type",
        headerName: "TYPE",
        editable: false,
        cellEditor: AccessibleSelectCellEditor,
        cellEditorParams: {
          values: ["Post", "Formative", "Pre"],
        },
      },
      {
        field: "assignment_weight",
        headerName: "%WEIGHT",
        editable: (params) => isEditing && params.data.assignment_type === "Post", // Only editable when Edit is active
        cellRenderer: (params) => {
          return params.data.assignment_type !== "Post" ? "-" : params.value || "";
        },
      },
      { field: "max_marks", headerName: "MAX MARKS", editable: isEditing },
    ];
  };

  /*----------- DATA TO SHOW WHEN BATCH STATUS IS CLICKED -----------*/
  const generateBatchStatusData = () => {
    if (!batchData?.students?.length) {
      return [];
    }

    return batchData.students.map(
      ({
        id,
        name,
        email,
        phone_number,
        gender,
        certification_eligibility,
        completion_status,
        reason_for_status,
        next_program,
        risk_factor,
        visual_acuity,
        grade,
        counseling_status,
        placement_status,
        placement_remarks,
        attendance: dbAttendance, // renamed to avoid confusion
        enrollment_status,
      }) => {
        // Filter attendance entries for this student, only up to today
        const today = normalizeDateString(new Date());
        const studentAttendance = batchData.attendance.filter((attendance) => {
          const dateStr = normalizeDateString(attendance.date);
          return attendance.student_id === id && attendance.is_present !== 2 && dateStr <= today;
        });

        // ✅ Fallback logic for attendance
        const attendance =
          dbAttendance != null
            ? `${Number(dbAttendance).toFixed(1)}%`
            : studentAttendance.length
              ? `${(
                  (studentAttendance.filter((a) => a.is_present === 1).length / studentAttendance.length) *
                  100
                ).toFixed(1)}%`
              : "N/A";

        // Compute Post Assessment Score (as percentage of 100)
        let postAssessmentScore = 0;
        batchData.grades
          .filter((g) => g.student_id === id && g.assignment_type === "Post")
          .forEach(({ grade, assignment_weight, max_marks }) => {
            postAssessmentScore += (grade / max_marks) * assignment_weight;
          });

        // ✅ Fallback logic for grade
        const finalGrade = grade != null ? Number(grade).toFixed(1) : postAssessmentScore.toFixed(1);

        const remarks = (batchData.remarksAndCommenterData ?? [])
          .filter(({ student_id }) => student_id === id)
          .map(({ name, remarks }) => `${name}: ${remarks}`)
          .join(" || ");

        const numericGrade = parseFloat(finalGrade);
        const numericAttendance = parseFloat(attendance);

        const isDroppedOut = enrollment_status === "DROPOUT";
        const droppedAttendance = batchData.attendance.filter(
          (attendance) => attendance.student_id === id && attendance.is_present == 3
        );
        const todayStr = normalizeDateString(new Date());

        const futureAttendance = batchData.attendance.filter((attendance) => {
          const dateStr = normalizeDateString(attendance.date);
          return attendance.student_id === id && dateStr > todayStr;
        });

        const calculated_certification_eligibility = resolveCertificationEligibility(
          batchStatusDerivedRules.certification,
          {
            savedValue: certification_eligibility != null ? certification_eligibility : undefined,
            isDroppedOut,
            hasDropAttendance: droppedAttendance.length > 0,
            numericGrade,
            numericAttendance,
          }
        );

        const calculated_completion_status = resolveCompletionStatus(batchStatusDerivedRules.completion, {
          savedValue: completion_status != null ? completion_status : undefined,
          isDroppedOut,
          hasDropAttendance: droppedAttendance.length > 0,
          hasFutureAttendance: futureAttendance.length > 0,
        });
        return {
          id,
          name,
          email,
          phone_number,
          gender,
          visual_acuity,
          attendance: parseFloat(String(attendance)),
          grade: parseFloat(String(finalGrade)),
          // attendance: `${parseFloat(String(attendance))} %`,
          // grade: `${parseFloat(String(attendance))} %`,
          completion_status: `${calculated_completion_status}`,
          reason_for_status,
          certification_eligibility: `${calculated_certification_eligibility}`,
          next_program,
          risk_factor,
          remarks,
          counseling_status,
          placement_status,
          placement_remarks,
        };
      }
    );
  };

  const generateStudentDocumentData = () => {
    let res = [];
    let totalAmount = 0,
      amount1 = 0,
      amount2 = 0,
      amount3 = 0;
    if (batchDocumentData?.documents) {
      res = batchDocumentData.documents.map((student) => {
        let studentDocuments = batchDocumentData.documents.filter((document) => document.id === student.id);
        let studentFees = batchDocumentData.fees.filter((fees) => fees.student_id === student.id);
        const studentData = {
          id: student.id,
          name: student.name,
        };
        // CHANGED: keep docs fields as "Yes"/"No" in grid rowData
        studentData["id_proof"] = convertNumberToYesNo(studentDocuments?.[0]?.id_proof);
        studentData["disability_cert"] = convertNumberToYesNo(studentDocuments?.[0]?.disability_cert);
        studentData["photo"] = convertNumberToYesNo(studentDocuments?.[0]?.photo);
        studentData["bank_details"] = convertNumberToYesNo(studentDocuments?.[0]?.bank_details);
        studentFees.forEach((fee) => {
          studentData["fee_paid"] = fee.fee_paid;
          studentData["amount_1"] = fee.amount_1;
          totalAmount += fee.amount_1;
          amount1 += fee.amount_1;
          studentData["amount_2"] = fee.amount_2;
          totalAmount += fee.amount_2;
          amount2 += fee.amount_2;
          studentData["amount_3"] = fee.amount_3;
          totalAmount += fee.amount_3;
          amount3 += fee.amount_3;
          studentData["nature_of_fee"] = fee.nature_of_fee;
        });
        return studentData;
      });
    }
    res["total_amount"] = totalAmount;
    res["total_amount_1"] = amount1;
    res["total_amount_2"] = amount2;
    res["total_amount_3"] = amount3;
    return res;
  };

  // This useEffect is redundant with the one above - keeping for safety but should be removed
  useEffect(() => {
    if (didInitRef.current) return;
    if (!id || !session?.user?.email) return;
    didInitRef.current = true;
    (async () => {
      // Parallel API calls for better performance
      await Promise.all([getBatchData(), getBatchDocumentData(), fetchUnassignedStudents(id)]);
    })();
  }, [session, id, fetchUnassignedStudents, getBatchData, getBatchDocumentData]);

  // Keep all derived state in sync with batchData (single source of truth). Runs when batchData/document/panel changes.
  useEffect(() => {
    setAttendanceColumn(generateColumnsFromDate());
    setAttendanceColumnStaff(generateColumnsFromDateStaff());
    if (
      userResponse.role === "STAFF" ||
      userResponse.role === "TRAINER" ||
      userResponse.role === "ASSISTANT_TRAINER" ||
      userResponse.role === "TRAINERPLUSTELECALLER"
    ) {
      setAttendanceData(generateStudentTableData());
    } else {
      setAttendanceData(generateStudentTableData());
    }
    setGradeData(generateGradeData());
    setGradesColumn(generateColumnsFromAssignment());
    setDocumentsData(generateStudentDocumentData());
    setAssessmentsData(sortedData());

    // BATCH STATUS
    setBatchStatusData(generateBatchStatusData());
  }, [
    batchData,
    currentPanel,
    batchDocumentData,
    userResponse.role,
    targetAttendanceDate, // Include targetAttendanceDate so columns update when date changes
    batchStatusDerivedRules,
  ]);

  /*------------------------- COLUMNS SECTION BEGINS ----------------------*/
  const docsColumns = [
    {
      headerName: "Name",
      field: "name",
      editable: false,
      headerTooltip: "Student name for document tracking",
      cellRenderer: (params) => {
        return <span role="rowheader">{params.value}</span>;
      },
    },
    {
      headerName: "ID Proof",
      field: "id_proof",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: {
        values: ["No", "Yes"],
      },
      headerTooltip: "Whether student has submitted ID proof",
      cellRenderer: (params) => {
        const value = params.value || "";
        const studentName = params.data?.name || "Unknown Student";
        return <span title={`Student ${studentName}, ID Proof: ${value}`}>{value}</span>;
      },
    },
    {
      headerName: "Disability Certificate",
      field: "disability_cert",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: {
        values: ["No", "Yes"],
      },
    },
    {
      headerName: "Photo",
      field: "photo",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: {
        values: ["No", "Yes"],
      },
    },
    {
      headerName: "Bank Details",
      field: "bank_details",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: {
        values: ["No", "Yes"],
      },
    },
    {
      headerName: "Fee Paid",
      field: "fee_paid",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: {
        values: ["NA", "Paid", "Not Paid", "Waiver", "Partial Waiver", "Installment"],
      },
    },
    {
      headerName: "Amount 1",
      field: "amount_1",
    },
    {
      headerName: "Amount 2",
      field: "amount_2",
    },
    {
      headerName: "Amount 3",
      field: "amount_3",
    },
    {
      headerName: "Nature of Fee",
      field: "nature_of_fee",
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: {
        values: ["NA", "Refundable", "Non-Refundable"],
      },
    },
    {
      headerName: "Remarks",
      field: "remarks",
      editable: false,
    },
    {
      headerName: "Commenter",
      field: "commenter",
      editable: false,
    },
  ];

  const batchStatusColumns = [
    {
      field: "actions",
      headerName: "Actions",
      width: 85,
      cellRenderer: (props) => RemarksActions(props),
      cellClass: "!flex !items-center !justify-center",
      sortable: false,
      filter: false,
      resizable: false,
      editable: false,
      headerTooltip: "Actions available for this student",
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

        if (event.key === "Tab") {
          // Allow normal tab navigation
          return false;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          if (button) {
            button.focus();
            button.click();
          }
          return true;
        }

        return false;
      },
    },
    {
      headerName: "Student ID",
      field: "id",
      editable: false,
    },
    {
      headerName: "Student Name",
      field: "name",
      editable: false,
      headerTooltip: "Student name for batch status tracking",
      cellRenderer: (params) => {
        return <span role="rowheader">{params.value}</span>;
      },
    },
    {
      headerName: "Email",
      field: "email",
      editable: false,
    },
    {
      headerName: "Phone No",
      field: "phone_number",
      editable: false,
    },
    {
      headerName: "Visual Acuity",
      field: "visual_acuity",
      editable: false,
    },
    {
      headerName: "Gender",
      field: "gender",
      editable: false,
    },
    {
      headerName: "Attendance %",
      field: "attendance",
      editable: false,
    },
    {
      headerName: "Final Grade",
      field: "grade",
      editable: false,
    },
    {
      headerName: "Completion Status",
      field: "completion_status",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: {
        values: completionStatusOptions.length > 0 ? completionStatusOptions : ["Completed", "Incomplete", "Drop Out"],
      },
    },
    {
      headerName: "Reason for status",
      field: "reason_for_status",
      editable: true,
    },
    {
      headerName: "Certification Eligibility",
      field: "certification_eligibility",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: {
        values:
          certificationEligibilityOptions.length > 0
            ? certificationEligibilityOptions
            : ["Completion Certificate", "Participation Certificate", "Not Eligible", "Ineligible"],
      },
    },
    {
      headerName: "Next Program",
      field: "next_program",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: {
        values: programOptions,
      },
    },
    {
      headerName: "Risk Factor",
      field: "risk_factor",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: {
        values: ["N/A", "Medium", "High"],
      },
    },
    {
      headerName: "Counseling Status",
      field: "counseling_status",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: {
        values: ["Yes", "No"],
      },
    },
    {
      headerName: "Placement Status",
      field: "placement_status",
      editable: true,
      cellEditor: AccessibleSelectCellEditor,
      cellEditorParams: {
        values: ["No Change", "During Training", "After Training", "Supported by Vision Aid"],
      },
    },
    {
      headerName: "Placement Remarks",
      field: "placement_remarks",
      editable: true,
    },
    {
      headerName: "Commenter and Remarks",
      field: "remarks",
      editable: false,
      autoHeight: true,
      cellRenderer: (params) => RemarksCellRenderer(params),
    },
  ];
  /*------------------------- COLUMNS SECTION ENDS ----------------------*/

  /*------------ AUTHENTICATION, SHOW BUTTONS SECTION BEGINS ------------*/
  // Prevent flicker: don't render anything until essential data is loaded
  if (status === "loading" || loading || !userResponse?.role) {
    return null;
  }
  if (status === "unauthenticated" || userResponse?.isactive !== "A") {
    return (
      <div className="autherrorcontainer">
        <Image src="/images/logo-mainsite.png?v=20251004" alt="VisionAid logo" height={100} width={150} />
        <span className="autherrortext">
          Access denied.&nbsp;
          <Link href="/" className="autherrorlink">
            Please sign in with an active account.
          </Link>
        </span>
      </div>
    );
  } else {
    if (allowedRoles.includes(userResponse?.role)) {
      if (staffHasAccess(batchData, userResponse)) {
        return (
          <>
            <GlobalSnackbar open={alertOpen} message={message} setOpen={setAlertOpen} severity={alertSeverity} />
            <ConfirmationModal
              open={confirmModalOpen}
              handleClose={handleConfirmModalClose}
              handleConfirm={handleConfirmModalConfirm}
              title={confirmModalTitle}
              message={confirmModalMessage}
              confirmColor={confirmModalConfirmColor}
            />
            <div className={styles.mynavbar}>
              <Navbar user_role={userResponse?.role} className={styles.navstudents} />
            </div>
            <div className={`${styles.container}`}>
              {contentLoading ? (
                <div className={styles.overlay}>
                  <span className={styles.customLoader}></span>
                </div>
              ) : (
                <></>
              )}
              <Head>
                <title>Batch {batchName} - Vision-Aid-STATS</title>
                <meta
                  name="description"
                  content="A nonprofit, advocating on behalf of persons with vision issues of any type"
                />
                <meta name="theme-color" content="#ffffff" />
                <link rel="icon" href="/favicon.ico" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <link rel="manifest" href="/manifest.json" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
              </Head>
              <h1 className={styles.titlebatchspecific}>
                Course: {courseName}, Batch: {batchName}
              </h1>
              <p className={styles.batchTextTotalStudents}>Total students enrolled: {batchLength}</p>

              {/*------------------ Blue buttons row BEGINS ----------------*/}
              <div className={styles.batchContainer}>
                <div className={styles.buttons}>
                  <button
                    id="batch-attendance-btn"
                    name="attendance"
                    className={styles.addButton}
                    {...createAccessibleButtonProps((e) => batchPageLayoutHandler(e))}
                    ref={buttonRef}
                    autoFocus={true}
                  >
                    Batch Attendance
                  </button>
                  <button
                    name="grades"
                    className={styles.addButton}
                    {...createAccessibleButtonProps((e) => batchPageLayoutHandler(e))}
                  >
                    Batch Grades
                  </button>
                  <button
                    name="batchstatus"
                    className={styles.addButton}
                    {...createAccessibleButtonProps((e) => batchPageLayoutHandler(e))}
                  >
                    Batch Status
                  </button>
                  {userResponse.role != "STAFF" && userResponse.role != "TRAINER" ? (
                    <button
                      name="documents"
                      className={styles.addButton}
                      {...createAccessibleButtonProps((e) => batchPageLayoutHandler(e))}
                    >
                      Documents & Fees
                    </button>
                  ) : (
                    <></>
                  )}
                  {userResponse.role != "STAFF" && userResponse.role != "TRAINER" ? (
                    <button
                      name="management"
                      className={styles.addButton}
                      {...createAccessibleButtonProps((e) => batchPageLayoutHandler(e))}
                    >
                      Batch Management
                    </button>
                  ) : (
                    <></>
                  )}
                  {userResponse.role != "STAFF" && userResponse.role != "TRAINER" ? (
                    <button
                      name="assessments"
                      className={styles.addButton}
                      {...createAccessibleButtonProps((e) => batchPageLayoutHandler(e))}
                    >
                      Assessment Management
                    </button>
                  ) : (
                    <></>
                  )}
                </div>
              </div>
              {/*------------------ Blue buttons row ENDS ----------------*/}

              {/*------- BLUE BUTTON-BatchManagement content BEGINS ------*/}
              {showManagement && (
                <div>
                  {/* Screen reader announcements */}
                  <div aria-live="polite" className="sr-only">
                    {announcement}
                  </div>
                  <div className={tableStyles.tableRow}>
                    <div className={tableStyles.tableColumn}>
                      <div className={tableStyles.genericTableHeader}>
                        <h2 style={{ marginRight: "0.5rem" }}>Assign Students to Batch</h2>
                        <button
                          className={styles.batchManagementButton}
                          aria-pressed={toggleUnassignedStudents}
                          aria-label={
                            toggleUnassignedStudents
                              ? "Showing interested students. Click to show all students"
                              : "Showing all students. Click to show only interested students"
                          }
                          {...createAccessibleButtonProps(() => handleToggleUnassignedStudents())}
                        >
                          {toggleUnassignedStudents ? "Show all students" : "Show interested students"}
                        </button>
                      </div>
                      <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-8">
                        <a id="skip-unassigned" href="#transfer-buttons" className="skip">
                          Skip Unassigned Students table and go to transfer buttons
                        </a>
                        <DataGrid
                          title="Unassigned Students"
                          rowData={unassignedStudents}
                          onGridReady={onLeftGridReady}
                          onCellKeyDown={handleLeftGridEsc}
                          exitTargetId="transfer-buttons"
                        />
                        <div id="transfer-buttons" tabIndex={-1}>
                          <TransferButtons onMoveRight={moveToRight} onMoveLeft={moveToLeft} />
                        </div>
                        <a id="skip-current-batch" href="#batch-attendance-btn" className="skip">
                          Skip Current Batch table and return to navigation
                        </a>
                        <DataGrid
                          title="Current Batch"
                          rowData={batchData.students}
                          onGridReady={onRightGridReady}
                          onCellKeyDown={handleRightGridEsc}
                          exitTargetId="batch-attendance-btn"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/*------- BLUE BUTTON-BatchManagement content ENDS ------*/}

              {/*------ BLUE BUTTON-showAttendance content BEGINS ------*/}
              {showAttendance &&
                (userResponse.role === "STAFF" ||
                userResponse.role === "TRAINER" ||
                userResponse.role === "TRAINERPLUSTELECALLER" ? (
                  attendanceColumnStaff.length > 0 ? (
                    <div>
                      <div className="flex w-[400px] flex-col">
                        {/* Attendance Table */}
                        <p style={{ fontSize: "0.7rem", fontStyle: "italic" }}>
                          Press Enter to open attendance dropdown
                        </p>
                        <div
                          className="ag-theme-alpine h-[70dvh] w-full overflow-y-auto"
                          role="region"
                          aria-label={`Attendance table`}
                        >
                          <AgGridReact
                            enableCellTextSelection={true}
                            columnDefs={attendanceColumnStaff}
                            rowData={attendanceData}
                            ref={gridRef}
                            onGridReady={(params) => {
                              attendanceGridApiRef.current = params.api;
                            }}
                            domLayout="autoHeight"
                            autoSizeStrategy={{ type: "fitCellContents" }}
                            defaultColDef={{
                              comparator: smartComparator,
                              cellRenderer,
                              filter: false,
                              resizable: true,
                              editable: true,
                            }}
                            loading={loading}
                            singleClickEdit={true}
                            onCellValueChanged={onAttendanceCellValueChanged}
                            stopEditingWhenCellsLoseFocus={true}
                            ensureDomOrder={true}
                            suppressGroupRowsSticky={true}
                            suppressRowVirtualisation={true}
                            onCellKeyDown={(params) => {
                              const { event, api, node, column, colDef, editing } = params;

                              // when Space or Enter is pressed, start editing
                              if (!editing && colDef.editable && (event.key === " " || event.key === "Enter")) {
                                api.startEditingCell({
                                  rowIndex: node.rowIndex,
                                  colKey: column.getColId(),
                                });
                                event.preventDefault();
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null
                ) : attendanceColumn.length > 0 ? (
                  <div className="flex flex-col">
                    <div className="mb-4 flex justify-end">
                      <button
                        className={styles.batchManagementButton}
                        {...createAccessibleButtonProps(() =>
                          exportToCsv("attendance.csv", mapAttendanceDataToCsv(attendanceData))
                        )}
                      >
                        Export to CSV
                      </button>
                    </div>
                    <div
                      className="ag-theme-alpine h-[70dvh] w-full overflow-y-auto"
                      role="region"
                      aria-label={`Attendance table`}
                    >
                      <AgGridReact
                        enableCellTextSelection={true}
                        columnDefs={attendanceColumn}
                        rowData={attendanceData}
                        ref={gridRef}
                        onGridReady={(params) => {
                          attendanceGridApiRef.current = params.api;
                        }}
                        domLayout="autoHeight"
                        autoSizeStrategy={{ type: "fitCellContents" }}
                        defaultColDef={{
                          comparator: smartComparator,
                          cellRenderer,
                          filter: false,
                          resizable: true,
                          editable: true,
                        }}
                        loading={loading}
                        singleClickEdit={true}
                        onCellValueChanged={onAttendanceCellValueChanged}
                        stopEditingWhenCellsLoseFocus={true}
                        ensureDomOrder={true}
                        suppressGroupRowsSticky={true}
                        suppressRowVirtualisation={true}
                        onCellKeyDown={(params) => {
                          const { event, api, node, column, colDef, editing } = params;

                          // when Space or Enter is pressed, start editing
                          if (!editing && colDef.editable && (event.key === " " || event.key === "Enter")) {
                            api.startEditingCell({
                              rowIndex: node.rowIndex,
                              colKey: column.getColId(),
                            });
                            event.preventDefault();
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : null)}
              {/*------- BLUE BUTTON-showAttendance content ENDS ------*/}

              {/*--------- BLUE BUTTON-showGrades content BEGINS ------*/}
              {showGrades && (
                <>
                  {gradesColumn.length > 0 ? (
                    <div className="flex flex-col">
                      <div className="mb-4 flex justify-end">
                        <button
                          className={styles.batchManagementButton}
                          {...createAccessibleButtonProps(() =>
                            exportToCsv("attendance.csv", mapAttendanceDataToCsv(attendanceData))
                          )}
                        >
                          Export to CSV
                        </button>
                      </div>
                      <div className="ag-theme-alpine h-[70dvh] w-full overflow-y-auto">
                        <AgGridReact
                          columnDefs={gradesColumn}
                          rowData={gradeData}
                          domLayout="autoHeight"
                          autoSizeStrategy={{ type: "fitCellContents" }}
                          defaultColDef={{
                            comparator: smartComparator,
                            filter: true,
                            resizable: true,
                            editable: true,
                          }}
                          loading={loading}
                          singleClickEdit={true}
                          onCellValueChanged={async (e) => {
                            // Early return if value hasn't actually changed
                            if (e.oldValue === e.newValue) {
                              return;
                            }

                            const assignmentName = e.colDef.field;
                            const headerName = e.colDef.headerName ?? assignmentName;
                            const confirmed = window.confirm(
                              `Do you want to save this change?\n\n${headerName} for ${e.data.name}: "${e.oldValue ?? ""}" → "${e.newValue ?? ""}"`
                            );
                            if (!confirmed) {
                              e.node.setDataValue(assignmentName, e.oldValue);
                              return;
                            }

                            setContentLoading(true);

                            try {
                              const newGrade = e.newValue;
                              const studentId = e.data.id;
                              const studentName = e.data.name;

                              const response = await fetch("/api/updategrade", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  batchId: id,
                                  studentId,
                                  assignmentName,
                                  newGrade,
                                  studentName,
                                }),
                              });

                              const result = await response.json();

                              if (!response.ok) {
                                setMessage(result.message || "Failed to update grade");
                                setAlertSeverity("error");
                                setAlertOpen(true);
                                // Revert the change by refreshing the data
                                await getBatchData();
                              } else {
                                setMessage("Grade updated successfully!");
                                setAlertSeverity("success");
                                setAlertOpen(true);
                              }
                            } catch (error) {
                              console.error("Error updating grade:", error);
                              setMessage("Failed to update grade. Please try again.");
                              setAlertSeverity("error");
                              setAlertOpen(true);
                              // Revert the change by refreshing the data
                              await getBatchData();
                            }

                            setContentLoading(false);
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <></>
                  )}
                </>
              )}

              {/*--------- BLUE BUTTON-showGrades content ENDS -------*/}

              {/*------ REPLACE CODE BELOW (CURRENTLY SHOWS BATCH COMPLETION DATA ------*/}
              {showBatchStatus && (
                <div>
                  <div className="flex justify-end">
                    <button
                      className={styles.batchManagementButton}
                      {...createAccessibleButtonProps(handleBatchStatusExport)}
                    >
                      Export to CSV
                    </button>
                  </div>
                  <br />
                  <div className="ag-theme-alpine h-[70dvh] w-full overflow-y-auto">
                    <AgGridReact
                      ref={gridRef}
                      enableCellTextSelection={true}
                      autoSizeStrategy={{ type: "fitCellContents" }}
                      columnDefs={batchStatusColumns}
                      context={{ batchId: id, onDataChange: getBatchData }}
                      defaultColDef={{
                        comparator: smartComparator,
                        filter: true,
                        resizable: true,
                        editable: false,
                        cellRenderer,
                      }}
                      loading={loading}
                      rowData={batchStatusData}
                      singleClickEdit={true}
                      onCellKeyDown={(params) => {
                        const { event: keyEvent, api, node, column, colDef, editing } = params;

                        // Check if we're in the actions column and spacebar was pressed
                        if (colDef.field === "actions" && keyEvent.key === " ") {
                          keyEvent.preventDefault();
                          keyEvent.stopPropagation();

                          // Find the button in the cell and trigger its click event
                          const cellElement = keyEvent.target.closest('[role="gridcell"]');
                          if (cellElement) {
                            const button = cellElement.querySelector("button");
                            if (button) {
                              button.click();
                            }
                          }
                        } else if (!editing && colDef.editable && (keyEvent.key === " " || keyEvent.key === "Enter")) {
                          api.startEditingCell({
                            rowIndex: node.rowIndex,
                            colKey: column.getColId(),
                          });
                          keyEvent.preventDefault();
                        }
                      }}
                      onCellValueChanged={async (e) => {
                        if (e.colDef.field === "next_program" && e.newValue === "Select") {
                          await getBatchData();
                          return;
                        }
                        const confirmed = window.confirm(
                          "Do you want to save this batch status change? The modified row data will be persisted."
                        );
                        if (!confirmed) {
                          await getBatchData();
                          return;
                        }
                        if (e.data.risk_factor === "N/A") {
                          e.data.risk_factor = "";
                        }
                        setContentLoading(true);
                        const payload = { batchId: id, ...e.data };
                        await fetch("/api/updatebatchstatus", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(payload),
                        });
                        await getBatchData();
                        setMessage("Batch status updated successfully!");
                        setAlertSeverity("success");
                        setAlertOpen(true);
                        setContentLoading(false);
                      }}
                      columnSize="autoSize"
                    />
                  </div>
                </div>
              )}
              {/*--------- BLUE BUTTON-showBatchStatus content ENDS -------*/}

              {/*----- BLUE BUTTON-showAssessments content BEGINS ----*/}
              {showAssessments && (
                <div>
                  {showForm ? (
                    <>
                      <div className={styles.cardcoursesform}>
                        <h2>Create Assessment</h2>
                        <form
                          id="create-assessment-form"
                          action="/api/addassignment"
                          method="post"
                          onSubmit={handleAssessmentFormSubmit}
                        >
                          <ul className="ml-5 list-none space-y-5">
                            <li>
                              <label htmlFor="assignment_name">
                                Assessment Name:
                                <span className={styles.requiredelement}>&#42;</span>
                              </label>
                              <input type="text" id="assignment_name" name="assignment_name" required />
                              <br />
                              <br />
                            </li>
                            <li>
                              <label htmlFor="assignment_type">
                                Assessment Type:
                                <span className={styles.requiredelement}>&#42;</span>
                              </label>
                              <input
                                type="radio"
                                id="formative"
                                name="assignment_type"
                                value="Formative"
                                onChange={handleAssignmentTypeChange}
                              />
                              &nbsp;
                              <label htmlFor="formative">Formative</label>
                              &nbsp;&nbsp;
                              <input
                                type="radio"
                                id="pre"
                                name="assignment_type"
                                value="Pre"
                                onChange={handleAssignmentTypeChange}
                              />
                              &nbsp;
                              <label htmlFor="pre">Pre</label>
                              &nbsp;&nbsp;
                              <input
                                type="radio"
                                id="post"
                                name="assignment_type"
                                value="Post"
                                onChange={handleAssignmentTypeChange}
                                defaultChecked
                              />
                              &nbsp;
                              <label htmlFor="post">Post</label>
                              <br />
                              <br />
                            </li>
                            {showInputs && (
                              <li>
                                <label htmlFor="assignment_weight">
                                  Assessment Weight:
                                  <span className={styles.requiredelement}>&#42;</span>
                                </label>
                                <input
                                  type="number"
                                  id="assignment_weight"
                                  name="assignment_weight"
                                  min={0}
                                  max={100}
                                  placeholder={0}
                                  required
                                />
                                <br />
                              </li>
                            )}
                            <li>
                              <label htmlFor="max_marks">
                                Max Marks:
                                <span className={styles.requiredelement}>&#42;</span>
                              </label>
                              <input type="number" id="max_marks" name="max_marks" placeholder={0} required />
                              <br />
                            </li>
                            <li>
                              <input type="hidden" name="batch_id" value={id}></input>
                              <div className="mt-5 flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  className="cursor-pointer rounded border-none bg-green-600 px-2 py-2 text-white hover:bg-green-700 active:bg-green-800"
                                  onClick={() => addAssignment(id)}
                                >
                                  Submit
                                </button>
                                <input
                                  type="reset"
                                  className="cursor-pointer rounded border-none bg-green-600 px-2 py-2 text-white hover:bg-green-700 active:bg-green-800"
                                  value="Reset"
                                />
                                <button
                                  type="button"
                                  className="cursor-pointer rounded border-none bg-red-600 px-2 py-2 text-white hover:bg-red-700 active:bg-red-800"
                                  onClick={() => setShowForm(false)}
                                  aria-label="Cancel and close create assessment form"
                                >
                                  Cancel
                                </button>
                              </div>
                            </li>
                          </ul>
                        </form>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          className="w-40 cursor-pointer rounded border-none bg-green-600 px-2 py-2 text-white hover:bg-green-700 active:bg-green-800"
                          {...createAccessibleButtonProps(() => exportToCsv("assessments.csv", assessmentsData))}
                        >
                          Export to CSV
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="mb-4 flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-3">
                        {!isEditing && (
                          <Button
                            {...createAccessibleButtonProps(() => {
                              setShowForm(true);
                              setShowInputs(true);
                            })}
                            text={"+ New Assessment Form"}
                          ></Button>
                        )}
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Button
                              {...createAccessibleButtonProps(handleSave)}
                              tabIndex={0}
                              aria-label="Save assessment weight changes"
                              text={"Save Changes"}
                            ></Button>
                            <Button
                              {...createAccessibleButtonProps(handleCancel)}
                              tabIndex={0}
                              aria-label="Cancel editing assessment weights"
                              text={"Cancel Changes"}
                              className="!border-red-700 !bg-red-600 !text-white hover:!bg-red-700 active:!bg-red-800"
                            ></Button>
                          </div>
                        ) : (
                          <Button
                            {...createAccessibleButtonProps(handleEdit)}
                            tabIndex={0}
                            aria-label="Edit assessment percent weights"
                            text={"Edit"}
                          ></Button>
                        )}
                        <Button
                          {...createAccessibleButtonProps(handleRefreshTable)}
                          tabIndex={0}
                          aria-label="Refresh assessment table"
                          text={"Refresh table"}
                        ></Button>
                      </div>
                      <button
                        type="button"
                        className="ml-auto w-40 cursor-pointer rounded border-none bg-green-600 px-2 py-2 text-white hover:bg-green-700 active:bg-green-800"
                        {...createAccessibleButtonProps(() => exportToCsv("assessments.csv", assessmentsData))}
                      >
                        Export to CSV
                      </button>
                    </div>
                  )}
                  {!showForm && isEditing && (
                    <p className="mb-2 text-sm text-gray-600" role="status" aria-live="polite">
                      Post weights total: <strong>{currentPostWeightTotal} / 100%</strong>
                      {currentPostWeightTotal !== 100 && " — Must equal 100% to save."}
                    </p>
                  )}
                  {!showForm && weightValidationError && (
                    <p className="mb-4 font-semibold text-red-600" role="alert">
                      {weightValidationError}
                    </p>
                  )}
                  <div className="ag-theme-alpine mt-4 h-[70dvh] w-full overflow-y-auto">
                    <AgGridReact
                      enableCellTextSelection={true}
                      ref={gridRef}
                      autoSizeStrategy={{ type: "fitCellContents" }}
                      columnDefs={generateBatchAssessmentCols()}
                      defaultColDef={{
                        comparator: smartComparator,
                        filter: true,
                        resizable: true,
                        editable: false,
                        cellRenderer,
                      }}
                      singleClickEdit={isEditing}
                      loading={loading}
                      rowData={assessmentEditRows.length > 0 ? assessmentEditRows : sortedData()}
                      onCellValueChanged={onCellValueChanged}
                      onGridReady={onGridReady}
                    />
                  </div>
                </div>
              )}
              {/*----- BLUE BUTTON-showAssessments content ENDS ----*/}

              {/*----- BLUE BUTTON-showDocuments content BEGINS ----*/}
              {showDocuments && (
                <div className="ag-theme-alpine h-[70dvh] w-full overflow-y-auto">
                  <AgGridReact
                    enableCellTextSelection={true}
                    ref={gridRef}
                    autoSizeStrategy={{ type: "fitCellContents" }}
                    columnDefs={docsColumns}
                    defaultColDef={{
                      comparator: smartComparator,
                      filter: true,
                      resizable: true,
                      editable: true,
                      cellRenderer,
                    }}
                    singleClickEdit={true}
                    loading={loading}
                    rowData={documentsData}
                    onCellValueChanged={(e) => {
                      const confirmed = window.confirm(
                        `Do you want to save this change?\n\n${e.colDef.headerName ?? e.colDef.field}: "${e.oldValue ?? ""}" → "${e.newValue ?? ""}"`
                      );
                      if (!confirmed) {
                        e.node.setDataValue(e.colDef.field, e.oldValue);
                        return;
                      }

                      // Ensure edited value is included in payload
                      const updated = { ...e.data, [e.colDef.field]: e.newValue };
                      updateDocumentsFee({ data: updated });
                    }}
                  />
                </div>
              )}
              {/*------ BLUE BUTTON-showDocuments content ENDS -----*/}
            </div>
            {/*----------------------------- CONTAINER ENDS ----------------------------*/}
          </>
        );
      } else {
        return (
          <>
            <GlobalSnackbar open={alertOpen} message={message} setOpen={setAlertOpen} severity={alertSeverity} />
            <ConfirmationModal
              open={confirmModalOpen}
              handleClose={handleConfirmModalClose}
              handleConfirm={handleConfirmModalConfirm}
              title={confirmModalTitle}
              message={confirmModalMessage}
              confirmColor={confirmModalConfirmColor}
            />
            <div className={styles.mynavbar}>
              <Navbar user_role={userResponse?.role} className={styles.navstudents} />
            </div>
            <div className={`${styles.container}`}>
              {contentLoading ? (
                <div className={styles.overlay}>
                  <span className={styles.customLoader}></span>
                </div>
              ) : (
                <></>
              )}
              <Head>
                <title>VisionAid</title>
                <meta
                  name="description"
                  content="A nonprofit, advocating on behalf of persons with vision issues of any type"
                />
                <meta name="theme-color" content="#ffffff" />
                <link rel="icon" href="/favicon.ico" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <link rel="manifest" href="/manifest.json" />

                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
              </Head>
              <h1 className={styles.titlebatchspecific}>
                Course: {courseName}, Batch: {batchName}
              </h1>
              <div className="autherrorcontainer">
                <span className="autherrortext">
                  Access denied.&nbsp;
                  <Link href="/batches" className="autherrorlink">
                    User does not have access to this batch.
                  </Link>
                </span>
              </div>
            </div>
          </>
        );
      }
    }
  }
}
