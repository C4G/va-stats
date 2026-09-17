import { prisma } from "@/lib/prisma";
import { parseCourseDays, isClassDay } from "@/utils/course-days";

type BatchDetailValue = string | number | bigint | boolean | Date | null;
type BatchDetailRow = Record<string, BatchDetailValue>;

const serializeBatchDetailRow = (row: BatchDetailRow): Record<string, string | number | boolean | Date | null> =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, typeof value === "bigint" ? value.toString() : value])
  );

// Format date as YYYY-MM-DD without timezone conversion
function formatDate(date) {
  if (!date) return "";

  // If it's already a YYYY-MM-DD string, return as-is (avoid timezone conversion)
  if (typeof date === "string") {
    const trimmed = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    // If it's an ISO string with time, just remove the time portion
    if (trimmed.includes("T")) {
      return trimmed.split("T")[0];
    }
  }

  // For Date objects or other formats, use local date components
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
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

  const dateArray: string[] = [];
  const currentDate = new Date(start);

  while (currentDate <= end) {
    if (isClassDay(currentDate.getDay(), courseDays)) {
      dateArray.push(formatDate(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dateArray;
}

export default async function handler(req, res) {
  const { batch_id } = req.body;
  const batchId = Number(batch_id);

  if (!Number.isInteger(batchId) || batchId <= 0) {
    return res.status(400).json({ error: "Invalid batch_id" });
  }

  try {
    const studentsQuery = `
      SELECT s.id, s.email, s.name, s.gender, s.phone_number, s.visual_acuity,
             s.first_choice, s.second_choice, s.third_choice,
             sb.reason_for_status, s.remarks, s.commenter,
             s.risk_factor,sb.completion_status, sb.certification_eligibility, sb.next_program,
             sb.grade, sb.attendance, s.city, s.state, s.age, s.edu_qualifications, s.employment_status,
             s.designation, s.disability_cert, s.photo, s.id_proof, sb.counseling_status,
             sb.placement_status, sb.placement_remarks, s.enrollment_status
      FROM vastudents s
      JOIN vastudent_to_batch sb ON s.id = sb.student_id
      WHERE sb.batch_id = ?
      ORDER BY s.name ASC
    `;

    const gradesQuery = `
      SELECT student_id, assignment_name, assignment_type, assignment_weight, grade, max_marks
      FROM va_grades
      WHERE batch_id = ?
    `;

    const attendanceQuery = `
      SELECT student_id, DATE_FORMAT(date, '%Y-%m-%d') AS date, is_present, coursestart, courseend, vabatches.coursedays
      FROM va_attendance
      JOIN vabatches ON va_attendance.batch_id = vabatches.id
      WHERE va_attendance.batch_id = ?
    `;

    const courseAndBatchNameQuery = `
      SELECT coursename, batch, instructor, PM, TA, currency, dataentry, coursedays, coursestart, courseend
      FROM vabatches
      WHERE id = ?
    `;

    const remarksAndCommentersQuery = `
      SELECT sb.student_id, r.remarks, r.user_id, u.name
      FROM va_remarks as r
      JOIN vastudent_to_batch as sb ON sb.id = r.vastudent_to_batch_id
      JOIN vausers as u ON u.id = r.user_id
      WHERE sb.batch_id = ?
    `;

    // Execute all queries in parallel for better performance
    const [studentsData, gradesData, attendanceData, courseAndBatchNameData, remarksAndCommenterData] =
      await Promise.all([
        prisma.$queryRawUnsafe<BatchDetailRow[]>(studentsQuery, batchId),
        prisma.$queryRawUnsafe<BatchDetailRow[]>(gradesQuery, batchId),
        prisma.$queryRawUnsafe<BatchDetailRow[]>(attendanceQuery, batchId),
        prisma.$queryRawUnsafe<BatchDetailRow[]>(courseAndBatchNameQuery, batchId),
        prisma.$queryRawUnsafe<BatchDetailRow[]>(remarksAndCommentersQuery, batchId),
      ]);

    const serializedStudentsData = studentsData.map(serializeBatchDetailRow);
    const serializedGradesData = gradesData.map(serializeBatchDetailRow);
    const serializedCourseAndBatchNameData = courseAndBatchNameData.map(serializeBatchDetailRow);
    const serializedRemarksAndCommenterData = remarksAndCommenterData.map(serializeBatchDetailRow);

    let attendance: Array<{ student_id: unknown; date: string; is_present: number }> = [];
    if (attendanceData.length > 0 && studentsData.length > 0) {
      const { coursestart, courseend, coursedays } = attendanceData[0];
      // Generate all class dates from start to end (for admin view to show all dates)
      const parsedCourseDays = parseCourseDays(typeof coursedays === "string" ? coursedays : "");
      const dateArray = generateDateArray(coursestart, courseend, parsedCourseDays);

      // Create a Map for O(1) lookup: key = "student_id|date", value = is_present
      const attendanceMap = new Map();
      attendanceData.forEach((record) => {
        const dateKey = formatDate(record.date);
        const key = `${record.student_id}|${dateKey}`;
        attendanceMap.set(key, Number(record.is_present));
      });

      // Generate attendance records efficiently
      serializedStudentsData.forEach((student) => {
        dateArray.forEach((date) => {
          // Include all dates (past, present, and future) for admin view
          // Attendance calculation will filter to today in frontend
          const key = `${student.id}|${date}`;
          attendance.push({
            student_id: student.id,
            date,
            is_present: attendanceMap.get(key) ?? 1,
          });
        });
      });
    }

    res.status(200).json({
      students: serializedStudentsData,
      grades: serializedGradesData,
      attendance: attendance,
      coursename: serializedCourseAndBatchNameData[0].coursename,
      batch: serializedCourseAndBatchNameData[0].batch,
      instructor: serializedCourseAndBatchNameData[0].instructor,
      PM: serializedCourseAndBatchNameData[0].PM, // ADD THIS
      TA: serializedCourseAndBatchNameData[0].TA,
      currency: serializedCourseAndBatchNameData[0].currency,
      dataentry: serializedCourseAndBatchNameData[0].dataentry,
      coursedays: serializedCourseAndBatchNameData[0].coursedays,
      coursestart: serializedCourseAndBatchNameData[0].coursestart,
      courseend: serializedCourseAndBatchNameData[0].courseend,
      remarksAndCommenterData: serializedRemarksAndCommenterData,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
