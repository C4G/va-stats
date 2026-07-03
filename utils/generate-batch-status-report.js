import { normalizeDateString } from "./course-days";
import { exportToCsv } from "./export-to-csv";
import {
  mergeBatchStatusDerivedRules,
  resolveCertificationEligibility,
  resolveCompletionStatus,
} from "./batch-status-derived";

/**
 * Generate and export batch status report
 * This function is shared between the single batch page and the reports page
 * to ensure identical CSV output matching the batch status tab logic
 *
 * @param {string} batchId - The batch ID
 * @param {string} batchName - The batch name (optional, will be fetched if not provided)
 * @param {string} courseName - The course name (optional, will be fetched if not provided)
 * @returns {Promise<void>}
 */
export const generateBatchStatusReport = async (batchId, batchName, courseName) => {
  if (!batchId) {
    if (typeof window !== "undefined") {
      window.alert("Batch ID is missing");
    }
    return;
  }

  try {
    // Fetch the full batch details (Students, Grades, Attendance, Remarks)
    const response = await fetch(`/api/getbatchdetails`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batch_id: batchId }),
    });

    if (!response.ok) throw new Error("Failed to fetch batch details");
    const batchData = await response.json();

    if (!batchData.students || batchData.students.length === 0) {
      if (typeof window !== "undefined") {
        window.alert("No students found for this batch");
      }
      return;
    }

    // Use fetched batch name and course name if not provided
    const finalBatchName = batchName || batchData.batch || "Unknown";
    const finalCourseName = courseName || batchData.coursename || "Unknown";

    let derivedRules = mergeBatchStatusDerivedRules(null);
    try {
      const rulesRes = await fetch(
        `/api/configurations/batchStatusRules?course=${encodeURIComponent(finalCourseName)}`
      );
      if (rulesRes.ok) {
        const rulesJson = await rulesRes.json();
        if (rulesJson?.rules) derivedRules = rulesJson.rules;
      }
    } catch {
      /* use defaults */
    }

    // Map the data using EXACT logic from generateBatchStatusData() in _id_.jsx
    const rows = batchData.students.map((student) => {
      const {
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
      } = student;

      // Filter attendance entries for this student, only up to today
      const today = normalizeDateString(new Date());
      const studentAttendance = batchData.attendance.filter((attendance) => {
        const dateStr = normalizeDateString(attendance.date);
        return attendance.student_id === id && attendance.is_present !== 2 && dateStr <= today;
      });

      //  Fallback logic for attendance (EXACT from batch status tab)
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

      // Fallback logic for grade (EXACT from batch status tab)
      const finalGrade = grade != null ? Number(grade).toFixed(1) : postAssessmentScore.toFixed(1);

      // Extract Remarks
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

      const calculated_certification_eligibility = resolveCertificationEligibility(derivedRules.certification, {
        savedValue: certification_eligibility != null ? certification_eligibility : undefined,
        isDroppedOut,
        hasDropAttendance: droppedAttendance.length > 0,
        numericGrade,
        numericAttendance,
      });

      const calculated_completion_status = resolveCompletionStatus(derivedRules.completion, {
        savedValue: completion_status != null ? completion_status : undefined,
        isDroppedOut,
        hasDropAttendance: droppedAttendance.length > 0,
        hasFutureAttendance: futureAttendance.length > 0,
      });

      // Return row matching exact structure of batchStatusData.
      // This matches the return statement in generateBatchStatusData().
      return {
        id,
        name,
        email,
        phone_number,
        gender,
        visual_acuity,
        attendance: parseFloat(String(attendance)),
        grade: parseFloat(String(finalGrade)),
        completion_status: `${calculated_completion_status}`,
        reason_for_status: reason_for_status || "",
        certification_eligibility: `${calculated_certification_eligibility}`,
        next_program: next_program || "",
        risk_factor: risk_factor || "",
        remarks,
        counseling_status: counseling_status || "No",
        placement_status: placement_status || "No Change",
        placement_remarks: placement_remarks || "",
      };
    });

    const totalStudents = rows.length;
    const validAttendances = rows.filter((r) => !isNaN(r.attendance) && r.attendance > 0);
    const validGrades = rows.filter((r) => !isNaN(r.grade) && r.grade > 0);

    const avgAttendance =
      validAttendances.length > 0
        ? (validAttendances.reduce((sum, r) => sum + r.attendance, 0) / validAttendances.length).toFixed(1)
        : "N/A";

    const avgGrade =
      validGrades.length > 0
        ? (validGrades.reduce((sum, r) => sum + r.grade, 0) / validGrades.length).toFixed(1)
        : "N/A";

    // Generate filename and summary rows.
    const fileName = `batchstatus_${finalBatchName}_${batchId}.csv`.replace(/\s+/g, "_");

    const summaryRows = [
      ["Batch Name: " + finalBatchName],
      ["Batch ID: " + batchId],
      ["Course Name: " + finalCourseName],
      ["Total Students: " + totalStudents],
      ["Average Attendance: " + (avgAttendance !== "N/A" ? `${avgAttendance}%` : avgAttendance)],
      ["Average Grade: " + (avgGrade !== "N/A" ? `${avgGrade}%` : avgGrade)],
    ];

    // Export to CSV
    exportToCsv(fileName, rows, summaryRows);
  } catch (error) {
    console.error("Error generating batch status report:", error);
    if (typeof window !== "undefined") {
      window.alert("Failed to download report. Please try again.");
    }
  }
};
