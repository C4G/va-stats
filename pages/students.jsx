import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { AgGridReact } from "ag-grid-react";
import { smartComparator } from "@/utils/grid-comparators";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import GlobalSnackbar from "../components/GlobalSnackbar";
// import { Button } from "@mui/material";
import Navbar from "@/components/Navbar";
import styles from "@/styles/Home.module.css";
import { getRowStyle } from "@/utils/get-row-style";
import { getUserEmail } from "@/utils/session-helpers";
import ConfirmationModal from "../components/ConfirmationModal";
import { ENROLLMENT_STATUS } from "../utils/enrollment";
import { useGetStudentColumnDefs } from "../utils/students/use-get-student-column-defs";
import { toDisplay } from "../utils/types/date";
import { normalizeDateValue, normalizeStudentDates } from "@/utils/date-normalizers";
import PageTitleWithUserGuideLink from "@/components/PageTitleWithUserGuideLink";

function CircleLoadingOverlay() {
  return (
    <div className={styles.overlay}>
      <span className={styles.customLoader}></span>
    </div>
  );
}

const Students = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Universal keyboard handler for buttons - handles both Enter and Space keys

  const [user, setUser] = useState();
  const [rowData, setRowData] = useState([]);
  const [allowedRoles] = useState(["ADMINISTRATOR", "MANAGEMENT", "TELECALLER", "TRAINERPLUSTELECALLER"]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [deleteStudentData, setDeleteStudentData] = useState(null);
  const [confirmTitle, setConfirmTitle] = useState();
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [pendingEdit, setPendingEdit] = useState(null);
  const gridRef = useRef(null);
  const lastFocusedCell = useRef(null);
  const isRevertingCellRef = useRef(false);

  const handleHistory = useCallback(
    (props) => {
      router.push(`/student/${props.data.id}`);
    },
    [router]
  );

  const handleDelete = (props) => {
    setDeleteStudentData(props.data);
    setConfirmTitle(`Delete ${props.data.name}`);
    setConfirmOpen(true);
  };

  // Call hooks before any early returns to comply with React Hooks rules
  const columnDefs = useGetStudentColumnDefs(handleHistory, handleDelete, user?.role);

  const normalizeForServer = (field, value) => {
    if (value === undefined) return null;
    if (field === "enrollment_status") {
      // Label is passed through, correct to code
      const s = typeof value === "string" ? value.trim() : value;
      const opt = ENROLLMENT_STATUS.find((o) => o.label === s || o.value === s);
      return opt ? opt.value : null;
    }
    if (field === "age" || field === "registration_date") {
      const normalized = normalizeDateValue(value);
      return normalized || null;
    }
    if (["id_proof", "disability_cert", "photo", "bank_details"].includes(field)) {
      if (value === "Yes") return 1;
      if (value === "No") return 0;
      // Number or null is passed through
      return value ?? null;
    }
    return value === "" ? null : value;
  };

  const dateColumns = ["age", "registration_date"];

  const cellRenderer = (params) => {
    const { colDef, data } = params;
    const value = dateColumns.includes(colDef.field) ? (params.value ? toDisplay(params.value) : "") : params.value;
    const fieldName = colDef.headerName ?? colDef.field;
    const personName = data.name;
    return (
      <div role="gridcell" aria-label={`${personName}'s ${fieldName}: ${value}`}>
        {value}
      </div>
    );
  };

  const saveStudent = async (payload) => {
    try {
      const r = await fetch("/api/updatestudents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        // Check if response is JSON
        const contentType = r.headers.get("content-type");
        let errorMessage = `HTTP error! status: ${r.status}`;

        if (contentType?.includes("application/json")) {
          try {
            const errorData = await r.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (jsonError) {
            // If JSON parsing fails, try text
            const text = await r.text();
            errorMessage = text.substring(0, 200) || errorMessage;
          }
        } else {
          // If not JSON, get text (but limit length)
          const text = await r.text();
          errorMessage = text.substring(0, 200) || errorMessage;
        }

        throw new Error(errorMessage);
      }

      // Parse response
      const contentType = r.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = await r.json();
        if (data.success !== false) {
          setRowData((prev) => prev.map((row) => (row.id === payload.student_id ? { ...row, ...payload } : row)));
          setMessage("Saved!");
          setAlertOpen(true);
          const focused = lastFocusedCell.current;
          if (focused && gridRef.current?.api) {
            const { rowIndex, colKey } = focused;
            const api = gridRef.current.api;
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                api.setFocusedCell(rowIndex, colKey);
              });
            });
          }
        } else {
          throw new Error(data.error || data.message || "Update failed");
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch (e) {
      console.error("Error saving student:", e);
      setMessage(`Save failed: ${e.message || "Unknown error"}`);
      setAlertOpen(true);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const getUserData = async () => {
      const userEmail = getUserEmail(session);
      if (!userEmail) {
        return;
      }

      // Parallel API calls for better performance
      const [userResponse, studentsResponse] = await Promise.all([
        fetch("/api/getuserdata", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: userEmail }),
        }),
        fetch(`/api/getstudentsdata?ts=${Date.now()}`, { cache: "no-store" }),
      ]);

      const [userData, studentsData] = await Promise.all([userResponse.json(), studentsResponse.json()]);

      const user = userData.users[0];
      setUser(user);

      // Check permissions before setting student data
      if (status === "unauthenticated" || user.isactive === 0 || allowedRoles.includes(user.role) === false) {
        router.push("/");
        return;
      }

      // Set student data if permission check passes
      if (studentsData && Array.isArray(studentsData.students)) {
        setRowData(normalizeStudentDates(studentsData.students));
        setLoading(false);
      }
    };
    if (!session) {
      return;
    }
    getUserData();
  }, [allowedRoles, router, session, status]);

  const onCellValueChanged = async (e) => {
    if (isRevertingCellRef.current) {
      isRevertingCellRef.current = false;
      return;
    }
    const field = e.colDef.field;
    if (!field) return;

    const student_id = e.data.id;
    if (!student_id) return;

    lastFocusedCell.current = { rowIndex: e.rowIndex, colKey: e.column.getColId() };

    const rawNew = typeof e.newValue === "string" ? e.newValue.trim() : e.newValue;
    const rawOld = typeof e.oldValue === "string" ? e.oldValue.trim() : e.oldValue;
    let value = rawNew;
    const headerName = e.colDef.headerName ?? field;

    // Handle telecaller remarks: save immediately (no confirmation modal)
    if (
      field === "telecaller_remarks" &&
      (user?.role === "TELECALLER" || user?.role === "TRAINER" || user?.role === "TRAINERPLUSTELECALLER")
    ) {
      try {
        const response = await fetch("/api/telecaller-remarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: student_id,
            remark: rawNew,
          }),
        });

        if (response.ok) {
          setMessage("Telecaller remarks updated successfully!");
          setAlertOpen(true);
          onGridReady();
        } else {
          setMessage("Error updating remarks. Please try again.");
          setAlertOpen(true);
        }
      } catch (error) {
        console.error("Error updating telecaller remarks:", error);
        setMessage("Error updating remarks. Please try again.");
        setAlertOpen(true);
      }
      return;
    }

    // enrollment_status allows code/label → normalize to code
    if (field === "enrollment_status") {
      const code = ENROLLMENT_STATUS.find((o) => o.value === rawNew || o.label === rawNew)?.value ?? null;
      if (rawNew && !code) {
        setMessage("Invalid enrollment status");
        setAlertOpen(true);
        return;
      }
      value = code; // Send only code to server
    }
    // Normalize values (dates, etc.)
    const next = normalizeForServer(field, value);
    const prev = normalizeForServer(field, rawOld);
    if (next === prev) return;

    setPendingEdit({
      field,
      student_id,
      value: next,
      rawOld,
      rawNew,
      node: e.node,
      isTelecallerRemarks: false,
      headerName,
    });
    setEditConfirmOpen(true);
  };

  const handleEditConfirmClose = () => {
    if (pendingEdit) {
      try {
        isRevertingCellRef.current = true;
        pendingEdit.node.setDataValue(pendingEdit.field, pendingEdit.rawOld);
      } catch (err) {
        console.warn("Could not revert cell:", err);
        isRevertingCellRef.current = false;
      }
      setPendingEdit(null);
    }
    setEditConfirmOpen(false);

    // Keep focus (blue border) on the cell the user just edited.
    // This mirrors the focus-retention behavior used after a successful save.
    const focused = lastFocusedCell.current;
    const api = gridRef.current?.api;
    if (focused && api) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          api.setFocusedCell(focused.rowIndex, focused.colKey);
        });
      });
    }
  };

  const handleEditConfirmSuccess = async () => {
    if (!pendingEdit) {
      setEditConfirmOpen(false);
      return;
    }
    const { field, student_id, value, rawOld, rawNew, node, isTelecallerRemarks } = pendingEdit;
    setEditConfirmOpen(false);
    setPendingEdit(null);

    if (isTelecallerRemarks) {
      try {
        const response = await fetch("/api/telecaller-remarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student_id, remark: rawNew }),
        });
        if (response.ok) {
          setMessage("Telecaller remarks updated successfully!");
          setAlertOpen(true);
          onGridReady();
        } else {
          setMessage("Error updating remarks. Please try again.");
          setAlertOpen(true);
          isRevertingCellRef.current = true;
          node.setDataValue(field, rawOld);
        }
      } catch (error) {
        console.error("Error updating telecaller remarks:", error);
        setMessage("Error updating remarks. Please try again.");
        setAlertOpen(true);
        isRevertingCellRef.current = true;
        node.setDataValue(field, rawOld);
      }
      return;
    }

    setSaving(true);
    saveStudent({ student_id, [field]: value });
  };

  const onGridReady = useCallback(() => {
    // Security check: Don't fetch data if user is not authenticated or authorized
    if (status === "unauthenticated" || !session || !user) {
      setLoading(false);
      return;
    }

    // Check permissions before fetching
    if (user.isactive === 0 || !allowedRoles.includes(user.role)) {
      setLoading(false);
      return;
    }

    // Data is already loaded in useEffect, just ensure grid is ready
    // This prevents duplicate API calls
    if (rowData.length > 0) {
      setLoading(false);
      return;
    }

    // Fallback: if data wasn't loaded in useEffect, fetch it here
    fetch(`/api/getstudentsdata?ts=${Date.now()}`, { cache: "no-store" })
      .then((response) => {
        if (response.status === 401 || response.status === 403) {
          // Unauthorized or forbidden - don't set data
          setLoading(false);
          return null;
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!data) return; // Handled by redirect above
        if (!data || !Array.isArray(data.students)) {
          console.error("Invalid students data:", data);
          setRowData([]); // ✅ Prevents undefined errors
          return;
        }

        setRowData(data.students);
        setLoading(false);
      })

      .catch((error) => {
        console.error("Error fetching students data:", error);
        setRowData([]);
        setLoading(false);
      });
  }, [rowData.length, status, session, user, allowedRoles]);

  const handleConfirmClose = () => {
    setConfirmOpen(false);
  };

  const handleConfirmSuccess = () => {
    setLoading(true);
    setConfirmOpen(false);
    fetch("/api/deletestudent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: deleteStudentData.id }),
    }).then(() => {
      const id = deleteStudentData.id;
      setMessage(`${deleteStudentData.name} was deleted!`);
      setDeleteStudentData(null);
      setAlertOpen(true);
      setRowData(rowData.filter((student) => student.id !== id));
      setLoading(false);
    });
  };

  const onExportClick = () => {
    if (gridRef.current && gridRef.current.api) {
      const allColumns = gridRef.current.api.getColumnDefs();
      const columnsToExclude = ["delete", "history"];
      const columnKeys = allColumns.map((col) => col.colId).filter((colId) => !columnsToExclude.includes(colId));
      gridRef.current.api.exportDataAsCsv({
        fileName: "students.csv",
        columnKeys,
        suppressQuotes: true,
        skipHeader: false,
      });
    }
  };

  if (loading) {
    return (
      <div className={styles.overlay}>
        <span className={styles.customLoader}></span>
      </div>
    );
  }

  if (status === "unauthenticated" || user?.isactive === 0) {
    return (
      <div className="autherrorcontainer">
        <Image src="/images/logo-mainsite.png?v=20251004" alt="VisionAid logo" width={120} height={60} />
        <span className="autherrortext">
          Access denied.&nbsp;
          <Link href="/" className="autherrorlink">
            Please sign in with an active account.
          </Link>
        </span>
      </div>
    );
  }

  // unauthorized role default return
  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="autherrorcontainer">
        <Image src="/images/logo-mainsite.png?v=20251004" alt="VisionAid logo" width={120} height={60} />
        <span className="autherrortext">
          Access denied.&nbsp;
          <Link href="/" className="autherrorlink">
            Please sign in with an account that has access.
          </Link>
        </span>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Students - Vision-Aid-STATS</title>
        <meta
          name="description"
          content="A nonprofit, advocating on behalf of persons with vision issues of any type"
        />
      </Head>
      <div className={styles.mynavbar}>
        <a href="#maincontent" className="skip" onClick={() => document.getElementById("maincontent")?.focus()}>
          Skip to main content
        </a>
        <Navbar user_role={user?.role} className={styles.navstudents} />
      </div>
      <main
        className={`mx-auto flex flex-col`}
        id="maincontent"
        tabIndex={-1}
        style={{ paddingLeft: "1rem", paddingRight: "1rem" }}
      >
        <div className="flex w-full items-center justify-between">
          <PageTitleWithUserGuideLink section_title="Student Management" />
          <button className={styles.studentsButton} onClick={onExportClick}>
            Export to CSV
          </button>
        </div>
        <style jsx>{`
          /* default top margin removal */
          .pageTitle {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
        `}</style>
        <div className={styles.gridcourses}>
          <GlobalSnackbar open={alertOpen} message={message} setOpen={setAlertOpen} />
          <ConfirmationModal
            open={confirmOpen}
            handleClose={handleConfirmClose}
            handleConfirm={handleConfirmSuccess}
            confirmColor="error"
            title={confirmTitle}
            message="Are you sure you want to delete this student? This action cannot be undone and will delete all fees, attendance, grades, and remarks for this student."
          />
          <ConfirmationModal
            open={editConfirmOpen}
            handleClose={handleEditConfirmClose}
            handleConfirm={handleEditConfirmSuccess}
            confirmColor="primary"
            title="Confirm change"
            message={
              pendingEdit
                ? `Do you want to save this change?\n\n${pendingEdit.headerName}: "${String(pendingEdit.rawOld ?? "").replace(/"/g, "'") || "(empty)"}" → "${String(pendingEdit.rawNew ?? "").replace(/"/g, "'") || "(empty)"}"`
                : "Are you sure you want to save?"
            }
          />
          <div className="ag-theme-alpine" style={{ height: "80dvh", width: "100%" }}>
            <AgGridReact
              enableCellTextSelection={true}
              ref={gridRef}
              getRowId={(params) => String(params.data?.id ?? params.node?.id)}
              autoSizeStrategy={{ type: "fitCellContents" }}
              columnDefs={columnDefs}
              defaultColDef={{
                comparator: smartComparator,
                filter: true,
                resizable: true,
                editable: true,
                wrapText: true,
                cellRenderer,
                cellClass: (params) => (params.colDef.editable === true ? styles.gridCellEditable : undefined),
                suppressKeyboardEvent: (params) => {
                  const { event, editing } = params;

                  // Prevent default scroll when Space is pressed
                  if (event.key === " " && !editing) {
                    event.preventDefault();
                    return true;
                  }

                  return false;
                },
              }}
              stopEditingWhenCellsLoseFocus={true}
              singleClickEdit={true}
              onCellValueChanged={onCellValueChanged}
              ensureDomOrder={true}
              loading={saving}
              loadingOverlayComponent={CircleLoadingOverlay}
              rowData={rowData}
              onGridReady={onGridReady}
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
              getRowStyle={getRowStyle}
            />
          </div>
        </div>
      </main>
    </>
  );
};

export default Students;
