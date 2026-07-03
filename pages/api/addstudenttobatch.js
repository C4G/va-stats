// NOTE: If default data should be entered when student is added to
// a batch, MySQL table column default and default value below must BOTH be set.

import { executeQuery } from "@/lib/db";
import { parseCourseDays, isClassDay } from "@/utils/course-days";

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generateDateArray(startDate, endDate, courseDays) {
  // Parse YYYY-MM-DD dates as local dates to avoid timezone issues
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const str = String(dateStr).split("T")[0]; // Extract YYYY-MM-DD part
    const [year, month, day] = str.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
    return [];
  }

  const dateArray = [];
  const currentDate = new Date(start);

  while (currentDate <= end) {
    if (isClassDay(currentDate.getDay(), courseDays)) {
      dateArray.push(formatDate(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dateArray;
}

async function createAttendanceRecords(batch_id, student_id, coursestart, courseend, coursedays) {
  const dateArray = generateDateArray(coursestart, courseend, coursedays);
  if (!dateArray.length) return;

  const placeholders = dateArray.map(() => "(?, ?, ?, ?)").join(",");

  // Per request, set the db value to 1 (Present) for default/initial data
  // But this will show as "-" for future dates in the UI
  // And can be updated as needed by the instructor
  const values = dateArray.flatMap((date) => [batch_id, student_id, date, 1]);

  try {
    await executeQuery({
      query: `
        INSERT INTO va_attendance (batch_id, student_id, date, is_present)
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE is_present = VALUES(is_present)
      `,
      values,
    });
  } catch (error) {
    console.log("Error inserting attendance records:", error);
  }
}

export default async function handler(req, res) {
  const { studentId, batchId } = req.body;

  try {
    const existingStudentBatch = await executeQuery({
      query: `
        SELECT 1
        FROM vastudent_to_batch
        WHERE student_id = ?
        LIMIT 1
      `,
      values: [studentId],
    });

    const studentAlreadyInBatch = existingStudentBatch.length > 0;
    await executeQuery({
      query: "INSERT INTO vastudent_to_batch (student_id, batch_id) VALUES (?, ?)",
      values: [studentId, batchId],
    });

    // Get the student ID proof, disability certificate, and photo information
    const getStudentIdInfo = await executeQuery({
      query: "SELECT id_proof, disability_cert, photo FROM vastudents WHERE id = ?",
      values: [studentId],
    });

    const idProof = getStudentIdInfo[0]?.id_proof || "yes";
    const disabilityCert = getStudentIdInfo[0]?.disability_cert || "yes";
    const photo = getStudentIdInfo[0]?.photo || "yes";

    // If student is already in the batch, we update their ID proof, disability certificate, and photo information
    // otherwise, we set them to "yes" as default values
    await executeQuery({
      query: `
        UPDATE vastudents
        SET id_proof = ?, disability_cert = ?, photo = ?
        WHERE id = ?
      `,
      values: studentAlreadyInBatch ? [idProof, disabilityCert, photo, studentId] : ["yes", "yes", "yes", studentId],
    });

    const result = await executeQuery({
      query: "SELECT DISTINCT assignment_name FROM va_grades WHERE batch_id = ? AND assignment_name IS NOT NULL",
      values: [batchId],
    });

    const assignments = result.map((assignment) => assignment.assignment_name);

    const courseDatesResult = await executeQuery({
      query: "SELECT coursestart, courseend, coursedays FROM vabatches WHERE id = ?",
      values: [batchId],
    });

    if (!courseDatesResult || courseDatesResult.length === 0) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    const coursestart = courseDatesResult[0].coursestart;
    const courseend = courseDatesResult[0].courseend;
    const coursedays = parseCourseDays(courseDatesResult[0].coursedays);

    await executeQuery({
      query: `
        UPDATE vastudents AS s
        JOIN vabatches AS b ON b.id = ?
        SET s.enrollment_status = 'ENROLLED'
        WHERE s.id = ?
          AND (b.courseend IS NULL OR b.courseend >= CURDATE())
      `,
      values: [batchId, studentId],
    });

    if (coursestart && courseend) {
      await createAttendanceRecords(batchId, studentId, coursestart, courseend, coursedays);
    }

    if (assignments && assignments.length > 0) {
      for (const assignment of assignments) {
        if (typeof assignment !== "undefined") {
          await executeQuery({
            query: "INSERT INTO va_grades (student_id, batch_id, assignment_name) VALUES (?, ?, ?)",
            values: [studentId, batchId, assignment],
          });
        } else {
          console.log("skipping");
        }
      }
    }

    try {
      await executeQuery({
        query: `INSERT INTO va_fees (batch_id, student_id, fee_paid) VALUES (?, ?, ?)`,
        values: [batchId, studentId, "NA"],
      });
    } catch (error) {
      console.log("Error inserting fees record:", error);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
}
