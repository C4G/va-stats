import { getBatchStatus } from "@/utils/batches/get-batches-columns-defs";
import { normalizeDateString } from "@/utils/course-days";

/**
 * Generate batch report CSV content
 * @param {Array} batches - Array of batches
 * @returns {Promise<string>} CSV content
 */
export const generateBatchReportCSV = async (batches) => {
  const csvRows = [];

  // Header row
  csvRows.push(
    [
      "Batch ID",
      "Batch Name",
      "Course Name",
      "Program Type",
      "Job Start Date",
      "Job End Date",
      "Training Days",
      "Total Number of Students",
      "No. of Dropouts",
      "Average Post Assessment Score",
      "Average Attendance",
      "Status",
    ].join(",")
  );

  // Data rows
  for (const batch of batches) {
    try {
      const statusData = await getBatchStatus(batch);
      const row = [
        batch.id,
        `"${batch.batch.replace(/"/g, '""')}"`,
        `"${batch.coursename.replace(/"/g, '""')}"`,
        batch.program_type || "",
        batch.coursestart || "",
        batch.courseend || "",
        batch.training_days || "",
        batch.enrolled_students ?? 0,
        statusData && statusData.dropout != null ? statusData.dropout : 0,
        statusData && statusData.average_post_score != null ? `${statusData.average_post_score.toFixed(1)}%` : "N/A",
        statusData && statusData.average_attendance != null ? `${statusData.average_attendance.toFixed(1)}%` : "N/A",
        statusData && statusData.status != null ? statusData.status : "",
      ].join(",");
      csvRows.push(row);
    } catch (error) {
      console.error("Error fetching batch status for batch:", batch.id, error);
      // Add a row with default values if error occurs
      const row = [
        batch.id,
        `"${batch.batch.replace(/"/g, '""')}"`,
        `"${batch.coursename.replace(/"/g, '""')}"`,
        batch.program_type || "",
        batch.coursestart || "",
        batch.courseend || "",
        batch.training_days || "",
        0,
        0,
        "N/A",
        "N/A",
        "",
      ].join(",");
      csvRows.push(row);
    }
  }

  return csvRows.join("\n");
};

/**
 * Calculate student grade
 * @param {Object} student - Student object
 * @param {Array} grades - Array of grades
 * @returns {string} Formatted grade
 */
const calculateGrade = (student, grades) => {
  let postAssessmentScore = 0;
  grades
    .filter((g) => g.student_id === student.id && g.assignment_type === "Post")
    .forEach(({ grade, assignment_weight, max_marks }) => {
      postAssessmentScore += (grade / max_marks) * assignment_weight;
    });

  return student.grade != null ? Number(student.grade).toFixed(1) : postAssessmentScore.toFixed(1);
};

/**
 * Calculate student attendance
 * @param {Object} student - Student object
 * @param {Array} attendanceRecords - Array of attendance records
 * @returns {string} Formatted attendance
 */
const calculateAttendance = (student, attendanceRecords) => {
  if (student.attendance != null) {
    return `${Number(student.attendance).toFixed(1)}%`;
  }

  const today = normalizeDateString(new Date());
  const studentAttendance = attendanceRecords.filter((attendance) => {
    const dateStr = normalizeDateString(attendance.date);
    return attendance.student_id === student.id && attendance.is_present !== 2 && dateStr <= today;
  });

  if (!studentAttendance.length) return "N/A";

  const presentCount = studentAttendance.filter((a) => a.is_present === 1).length;
  return `${((presentCount / studentAttendance.length) * 100).toFixed(1)}%`;
};

/**
 * Get student remarks
 * @param {Object} student - Student object
 * @param {Array} remarksData - Array of remarks data
 * @returns {string} Formatted remarks
 */
const getStudentRemarks = (student, remarksData) => {
  return (remarksData ?? [])
    .filter(({ student_id }) => student_id === student.id)
    .map(({ name, remarks }) => `${name}: ${remarks}`)
    .join(" || ");
};

/**
 * Generate student data report CSV content
 * @param {Array} batchIds - Array of batch IDs
 * @param {Object} batchIdToNameMap - Map of batch ID to batch name
 * @param {Function} fetchBatchDetailsFn - Function to fetch batch details
 * @returns {Promise<string>} CSV content
 */
export const generateStudentDataReportCSV = async (batchIds, batchIdToNameMap, fetchBatchDetailsFn) => {
  const csvRows = [];
  const allKeysSet = new Set();

  // Fetch all batch details
  const batchDetailPromises = batchIds.map(async (batchId) => {
    try {
      const batchDetails = await fetchBatchDetailsFn(batchId);
      return { batchId, batchDetails, success: true };
    } catch (err) {
      console.error(`Failed to fetch details for batch ${batchId}:`, err);
      return { batchId, error: err, success: false };
    }
  });

  const batchResults = await Promise.allSettled(batchDetailPromises);
  const successfulBatches = batchResults
    .filter((result) => result.status === "fulfilled" && result.value.success)
    .map((result) => result.value);

  // Collect all keys across all students
  successfulBatches.forEach(({ batchDetails }) => {
    const students = batchDetails.students || [];
    students.forEach((student) => {
      Object.keys(student).forEach((key) => allKeysSet.add(key));
    });
  });

  // Create header row
  const allKeys = Array.from(allKeysSet);
  csvRows.push(["Batch_Name", ...allKeys].join(","));

  // Create data rows
  successfulBatches.forEach(({ batchId, batchDetails }) => {
    const students = batchDetails.students || [];

    for (const student of students) {
      const finalGrade = calculateGrade(student, batchDetails.grades);
      const attendance = calculateAttendance(student, batchDetails.attendance);
      const remarks = getStudentRemarks(student, batchDetails.remarksAndCommenterData);

      const rowObj = {
        Batch_Name: batchIdToNameMap[batchId] || batchId,
      };

      for (const key of allKeys) {
        let cellValue = student[key] ?? "";

        if (key === "grade") {
          cellValue = finalGrade;
        } else if (key === "attendance") {
          cellValue = attendance;
        } else if (key === "remarks") {
          cellValue = remarks;
        }

        if (typeof cellValue === "string" && cellValue.includes(",")) {
          cellValue = `"${cellValue.replace(/"/g, '""')}"`;
        }

        rowObj[key] = cellValue;
      }

      const row = Object.values(rowObj).join(",");
      csvRows.push(row);
    }
  });

  return csvRows.join("\n");
};

/**
 * Trigger CSV download
 * @param {string} filename - File name
 * @param {string} csvContent - CSV content
 */
export const downloadCSV = (filename, csvContent) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
