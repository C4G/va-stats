import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  const { studentId, batchId } = req.body;

  try {
    // Delete attendance records
    try {
      await executeQuery({
        query: "DELETE FROM va_attendance WHERE batch_id = ? AND student_id = ?",
        values: [batchId, studentId],
      });
    } catch (error) {
      console.log("Error deleting attendance record:", error);
    }

    // Delete grades records
    try {
      await executeQuery({
        query: "DELETE FROM va_grades WHERE batch_id = ? AND student_id = ?",
        values: [batchId, studentId],
      });
    } catch (error) {
      console.log("Error deleting grades record:", error);
    }

    // Delete fee records
    try {
      await executeQuery({
        query: "DELETE FROM va_fees WHERE batch_id = ? AND student_id = ?",
        values: [batchId, studentId],
      });
    } catch (error) {
      console.log("Error deleting documents and fees record:", error);
    }

    // Delete Student-batch link
    try {
      await executeQuery({
        query: "DELETE FROM vastudent_to_batch WHERE batch_id = ? AND student_id = ?",
        values: [batchId, studentId],
      });
    } catch (error) {
      console.log("Error deleting student to batch record:", error);
    }

    // Check if student is still enrolled in any current or future batch
    // If not, set enrollment_status to AVAILABLE
    try {
      const activeBatches = await executeQuery({
        query: `
          SELECT 1
          FROM vabatches AS b
          JOIN vastudent_to_batch AS sb ON b.id = sb.batch_id
          WHERE sb.student_id = ?
            AND (b.courseend IS NULL OR b.courseend >= CURDATE())
            AND (b.status IS NULL OR UPPER(b.status) <> 'COMPLETE')
          LIMIT 1
        `,
        values: [studentId],
      });

      // If student is not in any current or future batch, set enrollment_status to AVAILABLE
      if (!activeBatches || activeBatches.length === 0) {
        await executeQuery({
          query: `
            UPDATE vastudents
            SET enrollment_status = 'AVAILABLE'
            WHERE id = ? AND enrollment_status = 'ENROLLED'
          `,
          values: [studentId],
        });
      }
    } catch (error) {
      console.log("Error updating enrollment status after batch removal:", error);
      // Don't fail the request if this check fails
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
}
