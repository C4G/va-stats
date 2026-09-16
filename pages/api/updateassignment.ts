import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  const body = req.body;
  const assignmentData = body.assignmentData;

  try {
    // MySQL bind params must not be undefined; use null for SQL NULL
    const values = [
      assignmentData.assignment_name,
      assignmentData.assignment_type,
      assignmentData.assignment_weight,
      assignmentData.max_marks,
      body.batchId,
      assignmentData.id,
    ].map((v) => (v === undefined ? null : v));

    await executeQuery({
      query: `UPDATE va_grades SET assignment_name = ?, assignment_type = ?, assignment_weight = ?, max_marks = ? WHERE batch_id = ? AND assignment_name = ?`,
      values,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
}
