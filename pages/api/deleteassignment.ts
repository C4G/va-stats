import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  const { batchId, assignmentName } = req.body;

  try {
    await executeQuery({
      query: "DELETE FROM va_grades WHERE batch_id = ? AND assignment_name = ?",
      values: [batchId, assignmentName],
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "An error occurred" });
  }
}
