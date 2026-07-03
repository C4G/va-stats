import { useSession } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, useCallback } from "react";
import Navbar from "../../components/Navbar";
import styles from "../../styles/Home.module.css";
import { getUserEmail } from "../../utils/session-helpers";
import { normalizeDateString } from "../../utils/course-days";
import {
  getRulesForCourse,
  mergeBatchStatusDerivedRules,
  resolveCertificationEligibility,
  resolveCompletionStatus,
} from "../../utils/batch-status-derived";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { AgGridReact } from "ag-grid-react";
import { ENROLLMENT_STATUS } from "../../utils/enrollment";
import { smartComparator } from "@/utils/grid-comparators";
import { dateFormatter, parseDateFromDateInput } from "@/utils/date-normalizers";

export default function Page() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();

  // state initializations
  const [loading, setLoading] = useState(true);
  const [userResponse, setUserResponse] = useState(null);
  const [dataResponse, setDataResponse] = useState([]);

  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [enrollmentStatus, setEnrollmentStatus] = useState("");

  /* ---------------------------------- API SECTION -----------------------------------*/
  const getUserData = useCallback(async () => {
    const userEmail = getUserEmail(session);
    if (!userEmail) return;
    const r = await fetch("/api/getuserdata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail }),
    });
    if (!r.ok) throw new Error(`getuserdata failed: ${r.status}`);
    const res = await r.json();
    setUserResponse(res.users[0]);
  }, [session]);

  const columnDefs = [
    { headerName: "Id", field: "id", width: 90 },
    { headerName: "Enrollment Status", field: "enrollment_status" },
    { headerName: "Name", field: "coursename" },
    { headerName: "Batch", field: "batch" },
    {
      headerName: "Start",
      field: "coursestart",
      valueFormatter: (params) => {
        if (params.value) {
          return dateFormatter.format(new Date(parseDateFromDateInput(params.value)));
        }
        return "";
      },
    },
    {
      headerName: "End",
      field: "courseend",
      valueFormatter: (params) => {
        if (params.value) {
          return dateFormatter.format(new Date(parseDateFromDateInput(params.value)));
        }
        return "";
      },
    },
    { headerName: "Instructor", field: "instructor" },
    { headerName: "Completion Status", field: "completion_status" },
    { headerName: "Reason for Status", field: "reason_for_status" },
    {
      headerName: "Certification Eligibility",
      field: "certification_eligibility",
    },
    { headerName: "Next Program", field: "next_program" },
    { headerName: "Remarks", field: "remarks" },
  ];

  /* ---------------------------------- API SECTION -----------------------------------*/

  const getBatchData = useCallback(async (batch, studentId, rulesPayload) => {
    const mergedRules = getRulesForCourse(rulesPayload, batch?.coursename);
    const response = await fetch("/api/getbatchdetails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batch_id: batch.id }),
    });
    if (!response.ok) throw new Error(`getbatchdetails failed: ${response.status}`);
    const data = await response.json();

    let postAssessmentScore = 0;
    const sid = Number(studentId);
    data.grades
      .filter((g) => g.student_id === sid && g.assignment_type === "Post")
      .forEach(({ grade, assignment_weight, max_marks }) => {
        postAssessmentScore += (grade / max_marks) * assignment_weight;
      });

    const studentAttendance = data.attendance.filter(
      (a) => a.student_id === sid && a.is_present !== 2 // 2=cancel → exclude from denominator
    );
    const presentUnits = studentAttendance.reduce(
      (sum, a) => sum + (a.is_present === 1 ? 1 : a.is_present === 4 ? 0.5 : 0),
      0
    );
    const totalUnits = studentAttendance.length;
    const fallbackAttendance = totalUnits ? (presentUnits / totalUnits) * 100 : NaN;

    const attendance =
      batch.attendance != null
        ? `${Number.parseFloat(String(batch.attendance)).toFixed(1)}%`
        : Number.isFinite(fallbackAttendance)
          ? `${fallbackAttendance.toFixed(1)}%`
          : "N/A";

    const droppedAttendance = data.attendance.filter((a) => a.student_id === sid && a.is_present === 3);
    const todayStr = normalizeDateString(new Date());
    const futureAttendance = data.attendance.filter((a) => {
      const dateStr = normalizeDateString(a.date);
      return dateStr > todayStr;
    });

    const numericAttendance = parseFloat(attendance); // "83.5%" → 83.5

    const savedCert =
      batch.certification_eligibility != null && String(batch.certification_eligibility).trim() !== ""
        ? batch.certification_eligibility
        : null;
    const savedComp =
      batch.completion_status != null && String(batch.completion_status).trim() !== "" ? batch.completion_status : null;
    const isDroppedOut = batch.enrollment_status === "DROPOUT";

    return {
      ...batch,
      grade: postAssessmentScore,
      attendance,
      certification_eligibility: resolveCertificationEligibility(mergedRules.certification, {
        savedValue: savedCert != null ? savedCert : undefined,
        isDroppedOut,
        hasDropAttendance: droppedAttendance.length > 0,
        numericGrade: postAssessmentScore,
        numericAttendance,
      }),
      completion_status: resolveCompletionStatus(mergedRules.completion, {
        savedValue: savedComp != null ? savedComp : undefined,
        isDroppedOut,
        hasDropAttendance: droppedAttendance.length > 0,
        hasFutureAttendance: futureAttendance.length > 0,
      }),
    };
  }, []);

  const getStudentData = useCallback(async () => {
    setLoading(true);

    const [rulesRes, detailsRes, studentRes] = await Promise.all([
      fetch("/api/configurations/batchStatusRules"),
      fetch("/api/getstudentdetails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: id }),
      }),
      fetch("/api/getstudent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }),
    ]);

    if (!detailsRes.ok) throw new Error(`getstudentdetails failed: ${detailsRes.status}`);
    const data = await detailsRes.json();

    let rulesPayload = mergeBatchStatusDerivedRules(null);
    if (rulesRes.ok) {
      try {
        const rulesJson = await rulesRes.json();
        if (rulesJson) rulesPayload = rulesJson;
      } catch {
        /* keep defaults */
      }
    }

    setStudentName(data.name);
    setStudentId(data.studentId);
    setDataResponse(data.batches);

    if (Array.isArray(data.batches)) {
      const updatedBatches = await Promise.all(data.batches.map((batch) => getBatchData(batch, id, rulesPayload)));
      setDataResponse(updatedBatches);
    }

    if (studentRes.ok) {
      const stu = await studentRes.json();
      setEnrollmentStatus(stu.enrollment_status ?? "");
    }
  }, [id, getBatchData]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "authenticated" && id) {
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          // Parallel API calls for better performance
          await Promise.all([getUserData(), getStudentData()]);
        } catch (error) {
          console.error("Error loading data:", error);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    if (status === "unauthenticated") setLoading(false);
  }, [status, id, getUserData, getStudentData]);
  const handleStatusChange = async (e) => {
    if (!id) return;
    const newVal = e.target.value;
    setEnrollmentStatus(newVal);
    const r = await fetch("/api/updatestudents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: Number(id),
        enrollment_status: newVal,
      }),
    });
    if (!r.ok) {
      console.error("Failed to update status", await r.text().catch(() => ""));
    }
  };

  if (loading) {
    return (
      <div className={styles.overlay}>
        <span className={styles.customLoader}></span>
      </div>
    );
  }

  if (status === "unauthenticated" || userResponse?.isactive === 0) {
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

  // unauthorized role default return (unauthorized role default return)
  if (
    !userResponse ||
    !["ADMINISTRATOR", "MANAGEMENT", "TELECALLER", "TRAINER", "TRAINERPLUSTELECALLER"].includes(userResponse.role)
  ) {
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

  // staff/manager display (staff/manager display)
  return (
    <>
      <div className={styles.mynavbar}>
        <Navbar user_role={userResponse.role} className={styles.navstudents} />
      </div>
      <Head>
        <title>Student-Enrollment - Vision-Aid-STATS</title>
        <meta
          name="description"
          content="A nonprofit, advocating on behalf of persons with vision issues of any type"
        />
        <meta name="theme-color" content="#ffffff" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>

      <br />

      <div>
        <p className={styles.subtitlestudent}>Student ID: {studentId}</p>
        <p className={styles.subtitlestudent}>Student: {studentName}</p>

        {/* Enrollment Status (Admin/Management) (Admin/Management) */}
        <div style={{ margin: "8px 0" }}>
          <label style={{ marginRight: 8 }}>Enrollment Status:</label>
          {["ADMINISTRATOR", "MANAGEMENT", "TELECALLER", "TRAINER", "TRAINERPLUSTELECALLER"].includes(
            userResponse.role
          ) ? (
            <select value={enrollmentStatus} onChange={handleStatusChange}>
              <option value="" disabled>
                — Select enrollment status —
              </option>
              {ENROLLMENT_STATUS.map((opt) => (
                <option key={opt.value || "null"} value={opt.value || ""}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <strong>{ENROLLMENT_STATUS.find((o) => o.value === enrollmentStatus)?.label ?? "Unassigned"}</strong>
          )}
        </div>

        <h2>Batches List</h2>
        <div className="ag-theme-alpine" style={{ height: "80dvh", width: "100%" }}>
          <AgGridReact
            enableCellTextSelection={true}
            autoSizeStrategy={{ type: "fitCellContents" }}
            columnDefs={columnDefs}
            defaultColDef={{
              comparator: smartComparator,
              filter: true,
              resizable: true,
              editable: true,
              suppressKeyboardEvent: (params) => {
                const { event, editing } = params;

                // when Space is pressed, prevent default scroll behavior
                if (event.key === " " && !editing) {
                  event.preventDefault();
                  return true;
                }

                return false;
              },
            }}
            loading={loading}
            rowData={dataResponse}
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
    </>
  );
}
