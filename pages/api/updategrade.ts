import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  if (req.method === "PATCH") {
    const { batchId, studentId, assignmentName, newGrade, studentName } = req.body;

    // Validate required fields
    if (!batchId || !studentId || !assignmentName || newGrade === undefined || newGrade === null) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: batchId, studentId, assignmentName, and newGrade are required",
      });
    }

    try {
      // Get current grade and max marks
      const rows = await executeQuery({
        query: "SELECT grade, max_marks FROM va_grades WHERE batch_id = ? AND student_id = ? AND assignment_name = ?",
        values: [batchId, studentId, assignmentName],
      });

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Grade record not found for batchId: ${batchId}, studentId: ${studentId}, assignment: ${assignmentName}`,
        });
      }

      const { grade, max_marks } = rows[0];

      // Validate grade range
      if (newGrade > max_marks || newGrade < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid grade: ${newGrade}. Grade must be between 0 and ${max_marks} for assignment: ${assignmentName}${studentName ? `, student: ${studentName}` : ""}`,
        });
      }

      // Only update if the grade has actually changed
      if (grade !== newGrade) {
        await executeQuery({
          query: "UPDATE va_grades SET grade = ? WHERE batch_id = ? AND student_id = ? AND assignment_name = ?",
          values: [newGrade, batchId, studentId, assignmentName],
        });
      }

      res.status(200).json({
        success: true,
        message: "Grade updated successfully!",
        data: {
          batchId,
          studentId,
          assignmentName,
          oldGrade: grade,
          newGrade,
          maxMarks: max_marks,
        },
      });
    } catch (error) {
      console.error("Error updating grade:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  } else {
    res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed. Use PATCH.`,
    });
  }
}
