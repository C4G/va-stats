// FILE CONTENTS: MySQL Courses table query

import { executeQuery } from "@/lib/db";
import { normalizeBatchDates } from "@/utils/date-normalizers";

export default async function handler(req, res) {
  try {
    const role = String(req.query.userRole || "")
      .trim()
      .toUpperCase();
    const nameRaw = String(req.query.userName || "").trim();
    const name = nameRaw.toLowerCase(); // case-insensitive comparison
    const batchId = req.query.batchId ? String(req.query.batchId).trim() : null;
    const values = [];

    /* ---------------- DATA MODIFICATION SECTION --------------- */
    let query = `
    WITH student_attendance AS (
      SELECT 
        batch_id,
        student_id,
        ROUND(
          (
            (
              COUNT(CASE WHEN is_present = 1 THEN 1 END) +
              0.5 * COUNT(CASE WHEN is_present = 4 THEN 1 END)
            ) * 100.0
          ) /
          NULLIF(COUNT(CASE WHEN is_present != 2 THEN 1 END), 0),
          2
        ) AS attendance_percentage
      FROM va_attendance
      WHERE is_present != 2
        AND date <= CURDATE()
      GROUP BY batch_id, student_id
    ),
    student_assessments AS (
      SELECT 
        sb.batch_id,
        sb.student_id,
        ROUND(
          (SUM((vg.grade / NULLIF(vg.max_marks, 0)) * vg.assignment_weight) / 
           NULLIF(SUM(vg.assignment_weight), 0)) * 100,
          2
        ) AS assessment_percentage
      FROM vastudent_to_batch sb
      JOIN va_grades vg ON vg.student_id = sb.student_id
      WHERE vg.batch_id = sb.batch_id
        AND vg.assignment_type = 'Post'
      GROUP BY sb.batch_id, sb.student_id
    )
    SELECT 
      b.id,
      b.coursename,
      b.batch,
      b.coursestart,
      b.courseend,
      b.coursedays,
      b.coursetimes,
      b.instructor,
      b.PM,
      b.TA,
      b.dataentry,
      b.cost,
      b.currency,
      b.strength,
      b.trainingmode,
      b.status,      
      (
        SELECT COUNT(DISTINCT sb.student_id)
        FROM vastudent_to_batch sb
        WHERE sb.batch_id = b.id
      ) AS enrolled,
      (
        SELECT COUNT(DISTINCT sb.student_id)
        FROM vastudent_to_batch sb
        JOIN va_attendance va ON va.student_id = sb.student_id AND va.batch_id = sb.batch_id
        WHERE sb.batch_id = b.id
          AND va.is_present = 3
      ) AS dropped,
      (
        SELECT COUNT(DISTINCT vf.student_id)
        FROM va_fees vf
        WHERE vf.batch_id = b.id
      ) AS total_students,
      (
        SELECT COALESCE(SUM(COALESCE(vf.amount_1, 0) + COALESCE(vf.amount_2, 0) + COALESCE(vf.amount_3, 0)), 0)
        FROM va_fees vf
        WHERE vf.batch_id = b.id
      ) AS collected_fees,
      (
        SELECT COALESCE(
          CONCAT(ROUND(AVG(sa.attendance_percentage), 0), '%'),
          '0%'
        )
        FROM student_attendance sa
        WHERE sa.batch_id = b.id
      ) AS attendance_percentage,
      (
        SELECT COALESCE(
          CONCAT(ROUND(AVG(sas.assessment_percentage), 0), '%'),
          '0%'
        )
        FROM student_assessments sas
        WHERE sas.batch_id = b.id
      ) AS assessment_percentage,
      (
        SELECT COUNT(*)
        FROM student_attendance sa
        WHERE sa.batch_id = b.id
          AND sa.attendance_percentage >= 60
      ) AS participation_certificate,
      (
        SELECT COALESCE(
          CONCAT(
            ROUND(
              (COUNT(*) * 100.0) / NULLIF(
                (SELECT COUNT(DISTINCT sb.student_id) FROM vastudent_to_batch sb WHERE sb.batch_id = b.id), 
                0
              ), 
              1
            ), 
            '%'
          ),
          '0%'
        )
        FROM student_attendance sa
        WHERE sa.batch_id = b.id
          AND sa.attendance_percentage >= 60
      ) AS participation_percentage,
      (
        SELECT COUNT(*)
        FROM student_assessments sas
        WHERE sas.batch_id = b.id
          AND sas.assessment_percentage >= 50
      ) AS passing_students,
      (
        SELECT COALESCE(
          CONCAT(
            ROUND(
              (COUNT(*) * 100.0) / NULLIF(
                (SELECT COUNT(DISTINCT sb.student_id) FROM vastudent_to_batch sb WHERE sb.batch_id = b.id), 
                0
              ), 
              1
            ), 
            '%'
          ),
          '0%'
        )
        FROM student_assessments sas
        WHERE sas.batch_id = b.id
          AND sas.assessment_percentage >= 50
      ) AS pass_percentage,
      (
        SELECT COUNT(*)
        FROM student_attendance sa
        JOIN student_assessments sas ON sa.batch_id = sas.batch_id AND sa.student_id = sas.student_id
        WHERE sa.batch_id = b.id
          AND sa.attendance_percentage >= 60
          AND sas.assessment_percentage >= 50
      ) AS completion_certificate,
      (
        SELECT COALESCE(
          CONCAT(
            ROUND(
              (COUNT(*) * 100.0) / NULLIF(
                (SELECT COUNT(DISTINCT sb.student_id) FROM vastudent_to_batch sb WHERE sb.batch_id = b.id), 
                0
              ), 
              1
            ), 
            '%'
          ),
          '0%'
        )
        FROM student_attendance sa
        JOIN student_assessments sas ON sa.batch_id = sas.batch_id AND sa.student_id = sas.student_id
        WHERE sa.batch_id = b.id
          AND sa.attendance_percentage >= 60
          AND sas.assessment_percentage >= 50
      ) AS completion_percentage
    FROM vabatches b
  `;

    // Build WHERE clause conditions
    const whereConditions = [];

    // Filter by batchId if provided (for checking batch ID existence)
    if (batchId) {
      whereConditions.push(`LOWER(TRIM(b.batch)) = LOWER(TRIM(?))`);
      values.push(batchId);
    }

    // Filter batches based on user role
    // STAFF/TRAINER can access batches where they are listed as instructor, PM, TA, or dataentry
    if (role === "STAFF" || role === "TRAINER") {
      const roleConditions = [
        `LOWER(TRIM(COALESCE(b.instructor, ''))) = LOWER(TRIM(?))`,
        `LOWER(TRIM(COALESCE(b.PM, '')))        = LOWER(TRIM(?))`,
        `LOWER(TRIM(COALESCE(b.TA, '')))        = LOWER(TRIM(?))`,
        `LOWER(TRIM(COALESCE(b.dataentry, ''))) = LOWER(TRIM(?))`,
      ];
      whereConditions.push(`(${roleConditions.join(" OR ")})`);
      values.push(name, name, name, name);
    }

    // Add WHERE clause if there are any conditions
    if (whereConditions.length > 0) {
      query += `\n    WHERE ${whereConditions.join(" AND ")}`;
    }
    // ADMINISTRATOR/MANAGEMENT: no role filter (all view), but batchId filter still applies if provided

    query += " ORDER BY STR_TO_DATE(coursestart, '%Y-%m-%d') DESC";

    const data = await executeQuery({ query, values });
    const normalized = normalizeBatchDates(data);
    res.status(200).json({ batches: normalized });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
