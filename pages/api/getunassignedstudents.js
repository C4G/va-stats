import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { batch_id } = req.body;

    // Validate batch_id
    if (!batch_id) {
      return res.status(400).json({ error: "batch_id is required" });
    }

    // Convert to number if it's a string
    const batchIdNum = typeof batch_id === "string" ? parseInt(batch_id, 10) : batch_id;
    if (isNaN(batchIdNum) || batchIdNum <= 0) {
      return res.status(400).json({ error: "Invalid batch_id" });
    }

    const studentsQuery = `
      SELECT id, name
      FROM vastudents
      WHERE id NOT IN (
        SELECT student_id
        FROM vastudent_to_batch
        WHERE batch_id = ?
      )
    `;

    const studentsData = await executeQuery({
      query: studentsQuery,
      values: [batchIdNum],
    });

    res.status(200).json({
      students: studentsData || [],
    });
  } catch (error) {
    console.error("Error in getunassignedstudents:", error);
    if (process.env.NODE_ENV === "development") {
      console.error("Error stack:", error.stack);
      console.error("Request body:", req.body);
    }
    res.status(500).json({
      error: error.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
