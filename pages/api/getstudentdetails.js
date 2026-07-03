import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  const { student_id } = req.body;

  try {
    const studentsQuery = `
      SELECT 
        b.id,
        b.coursename,
        b.batch,
        b.coursestart,
        b.courseend,
        b.instructor,
        sb.completion_status,
        sb.reason_for_status,
        sb.certification_eligibility,
        sb.grade,
        sb.attendance,
        sb.next_program,
        s.enrollment_status AS enrollment_status,
        GROUP_CONCAT(DISTINCT CONCAT(u.name, ': ', r.remarks) SEPARATOR ' || ') AS remarks
      FROM vabatches b
      JOIN vastudent_to_batch sb ON b.id = sb.batch_id
      JOIN vastudents s ON s.id = sb.student_id
      LEFT JOIN va_remarks r ON sb.id = r.vastudent_to_batch_id
      LEFT JOIN vausers u ON r.user_id = u.id
      WHERE sb.student_id = ?
      GROUP BY 
        b.id, b.coursename, b.batch, b.coursestart, b.courseend, b.instructor,
        sb.completion_status, sb.reason_for_status, sb.certification_eligibility,
        sb.grade, sb.attendance, sb.next_program, s.enrollment_status
    `;

    const studentNameQuery = `
      SELECT name, id
      FROM vastudents
      WHERE id = ?
    `;

    // Parallel execution of queries for better performance
    const [studentsData, studentNameData] = await Promise.all([
      executeQuery({
        query: studentsQuery,
        values: [student_id],
      }),
      executeQuery({
        query: studentNameQuery,
        values: [student_id],
      }),
    ]);

    res.status(200).json({
      batches: studentsData,
      name: studentNameData[0]?.name ?? null,
      studentId: studentNameData[0]?.id ?? null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
