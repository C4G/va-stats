import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  const body = req.body;

  try {
    const studentToBatch = await executeQuery({
      query: "SELECT id FROM vastudent_to_batch WHERE batch_id = ? AND student_id = ?",
      values: [parseInt(body.batchId), parseInt(body.studentId)],
    });

    const id = studentToBatch[0]?.id;
    if (!id) {
      return res.status(404).json({
        success: false,
        message: "The student does not exist for this batch",
      });
    }
    if (body.isUpdated) {
      // Delete all past remarks
      await executeQuery({
        query: "DELETE FROM va_remarks WHERE vastudent_to_batch_id = ? and user_id = ?",
        values: [id, body.commenter],
      });

      // Re-insert past remarks
      for (const pastRemark of body.remarksArray) {
        await executeQuery({
          query: "INSERT INTO va_remarks (vastudent_to_batch_id, remarks, user_id) VALUES (?, ?, ?)",
          values: [id, pastRemark, body.commenter],
        });
      }
    }
    if (body.remarks !== "") {
      await executeQuery({
        query: "INSERT INTO va_remarks (vastudent_to_batch_id, remarks, user_id) VALUES (?, ?, ?)",
        values: [id, body.remarks, body.commenter],
      });
    }

    res.status(200).json({ success: true, message: "Remark added successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "An error occurred, " + error });
  }
}
