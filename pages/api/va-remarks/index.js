import { executeQuery } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  // Get user session for authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    // Fetch va remarks for a student in a specific batch
    const { student_id, batch_id } = req.query;

    if (!student_id || !batch_id) {
      return res.status(400).json({ error: "Student ID and Batch ID are required" });
    }

    try {
      const results = await executeQuery({
        query: `
          SELECT 
            vr.id,
            vr.remarks,
            vr.user_id,
            u.name as user_name,
            u.email as user_email
          FROM va_remarks vr
          JOIN vastudent_to_batch stb ON vr.vastudent_to_batch_id = stb.id
          JOIN vausers u ON vr.user_id = u.id
          WHERE stb.student_id = ? AND stb.batch_id = ?
          ORDER BY vr.id DESC
        `,
        values: [parseInt(student_id), parseInt(batch_id)],
      });

      return res.status(200).json(results);
    } catch (error) {
      console.error("Error fetching va remarks:", error);
      return res.status(500).json({ error: "Failed to fetch va remarks" });
    }
  }

  if (req.method === "POST") {
    // Add a new va remark
    const { student_id, batch_id, remarks } = req.body;

    if (!student_id || !batch_id || !remarks) {
      return res.status(400).json({ error: "Student ID, Batch ID, and remarks are required" });
    }

    try {
      // Get user ID from session
      const userId = session?.user?.id;

      if (!userId) {
        return res.status(404).json({ error: "User ID not found in session" });
      }

      // First, get the vastudent_to_batch_id
      const studentToBatchResult = await executeQuery({
        query: "SELECT id FROM vastudent_to_batch WHERE student_id = ? AND batch_id = ?",
        values: [parseInt(student_id), parseInt(batch_id)],
      });

      if (!studentToBatchResult || studentToBatchResult.length === 0) {
        return res.status(404).json({ error: "Student not found in this batch" });
      }

      const vastudentToBatchId = studentToBatchResult[0].id;

      // Insert the new remark
      const insertResult = await executeQuery({
        query: `
          INSERT INTO va_remarks (vastudent_to_batch_id, remarks, user_id)
          VALUES (?, ?, ?)
        `,
        values: [vastudentToBatchId, remarks, userId],
      });

      return res.status(201).json({
        success: true,
        id: insertResult.insertId,
        message: "VA remark added successfully",
      });
    } catch (error) {
      console.error("Error adding va remark:", error);
      return res.status(500).json({ error: "Failed to add va remark" });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: "Method not allowed" });
}
