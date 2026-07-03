import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(400).json({ success: false, message: "Invalid request method" });
  }
  const { batchId, date } = req.body;
  if (!batchId || !date) {
    console.error("Missing parameters in batch attendance update request.");
    return res.status(400).json({ success: false, message: "Missing required parameters" });
  }
  try {
    await executeQuery({
      query: "UPDATE va_attendance SET is_present = 2 WHERE batch_id = ? AND date = ?",
      values: [batchId, date],
    });
    res.status(200).json({
      success: true,
      message: "Batch attendance updated successfully",
    });
  } catch (error) {
    console.error("Database error in update batch attendance:", error);
    res.status(500).json({ success: false, message: "Error updating batch attendance" });
  }
}
