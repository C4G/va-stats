import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  const body = req.body;

  try {
    if (body.batch_id == null || body.batch_id === "") {
      return res.status(400).json({ success: false, message: "batch_id is required." });
    }

    const students = await executeQuery({
      query: "SELECT s.id FROM vastudents s JOIN vastudent_to_batch sb ON s.id = sb.student_id WHERE sb.batch_id = ?",
      values: [body.batch_id],
    });

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "This batch has no students yet. Add at least one student to the batch before creating assessments.",
      });
    }

    // Bulk insert for better performance - insert all students at once
    const placeholders = students.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(",");
    const values = students.flatMap((student) => [
      student.id,
      body.batch_id,
      body.assignment_name,
      body.assignment_type,
      body.assignment_weight,
      0,
      body.max_marks,
    ]);

    await executeQuery({
      query: `INSERT INTO va_grades (student_id, batch_id, assignment_name, assignment_type, assignment_weight, grade, max_marks) VALUES ${placeholders}`,
      values,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "An error occurred, " + error });
  }

  // res.writeHead(301, {
  //   Location: '/batch/'+body.batch_id,
  // });

  // res.end();
}
