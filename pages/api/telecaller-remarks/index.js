import { executeQuery } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  // Get user session for authentication
  let session = null;
  try {
    session = await getServerSession(req, res, authOptions);
  } catch (sessionError) {
    // Handle JWT decryption errors gracefully
    if (sessionError.code === "ERR_JWE_DECRYPTION_FAILED") {
      console.error("Session decryption failed:", sessionError);
      return res.status(401).json({ error: "Unauthorized" });
    } else {
      throw sessionError;
    }
  }

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    // Fetch telecaller remarks for a student
    const { student_id } = req.query;

    if (!student_id) {
      return res.status(400).json({ error: "Student ID is required" });
    }

    try {
      // Validate student_id
      const studentId = parseInt(student_id);
      if (isNaN(studentId)) {
        return res.status(400).json({ error: "Invalid student ID" });
      }

      const results = await executeQuery({
        query: `
          SELECT 
            tr.id,
            tr.remark,
            tr.created_at,
            tr.updated_at,
            u.name as user_name,
            u.email as user_email
          FROM telecaller_remarks tr
          LEFT JOIN vausers u ON tr.user_id = u.id
          WHERE tr.student_id = ?
          ORDER BY tr.created_at DESC
        `,
        values: [studentId],
      });

      return res.status(200).json(results || []);
    } catch (error) {
      console.error("Error fetching telecaller remarks:", error);
      return res.status(500).json({
        error: "Failed to fetch telecaller remarks",
        message: error.message,
      });
    }
  }

  if (req.method === "POST") {
    // Add a new telecaller remark
    const { student_id, remark } = req.body;

    if (!student_id || !remark) {
      return res.status(400).json({ error: "Student ID and remark are required" });
    }

    try {
      // Get user ID from email (more reliable than session.user.id)
      const performerEmail = session?.user?.email || null;
      if (!performerEmail) {
        return res.status(401).json({ error: "User email not found in session" });
      }

      const performerData = await executeQuery({
        query: "SELECT id FROM vausers WHERE email = ?",
        values: [performerEmail],
      });

      const userId = performerData?.[0]?.id ?? null;
      if (!userId) {
        return res.status(404).json({ error: "User not found" });
      }

      // Insert the new remark
      const insertResult = await executeQuery({
        query: `
          INSERT INTO telecaller_remarks (student_id, user_id, remark, created_at, updated_at)
          VALUES (?, ?, ?, NOW(), NOW())
        `,
        values: [parseInt(student_id), userId, remark],
      });

      return res.status(201).json({
        success: true,
        id: insertResult.insertId,
        message: "Telecaller remark added successfully",
      });
    } catch (error) {
      console.error("Error adding telecaller remark:", error);
      return res.status(500).json({ error: "Failed to add telecaller remark" });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: "Method not allowed" });
}
