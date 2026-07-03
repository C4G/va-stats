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

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Remark ID is required" });
  }

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

  if (req.method === "DELETE") {
    // Delete a telecaller remark (only by the user who created it)
    try {
      // Check if the remark exists and belongs to the current user
      const remarkResult = await executeQuery({
        query: "SELECT id, user_id FROM telecaller_remarks WHERE id = ?",
        values: [parseInt(id)],
      });

      if (!remarkResult || remarkResult.length === 0) {
        return res.status(404).json({ error: "Remark not found" });
      }

      if (remarkResult[0].user_id !== userId) {
        return res.status(403).json({ error: "You can only delete your own remarks" });
      }

      // Delete the remark
      await executeQuery({
        query: "DELETE FROM telecaller_remarks WHERE id = ? AND user_id = ?",
        values: [parseInt(id), userId],
      });

      return res.status(200).json({
        success: true,
        message: "Telecaller remark deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting telecaller remark:", error);
      return res.status(500).json({ error: "Failed to delete telecaller remark" });
    }
  }

  if (req.method === "PATCH") {
    // Update a telecaller remark (only by the user who created it)
    const { remark } = req.body;

    if (!remark || !remark.trim()) {
      return res.status(400).json({ error: "Remark content is required" });
    }

    try {
      // Check if the remark exists and belongs to the current user
      const remarkResult = await executeQuery({
        query: "SELECT id, user_id FROM telecaller_remarks WHERE id = ?",
        values: [parseInt(id)],
      });

      if (!remarkResult || remarkResult.length === 0) {
        return res.status(404).json({ error: "Remark not found" });
      }

      if (remarkResult[0].user_id !== userId) {
        return res.status(403).json({ error: "You can only edit your own remarks" });
      }

      // Update the remark
      await executeQuery({
        query: "UPDATE telecaller_remarks SET remark = ?, updated_at = NOW() WHERE id = ? AND user_id = ?",
        values: [remark.trim(), parseInt(id), userId],
      });

      return res.status(200).json({
        success: true,
        message: "Telecaller remark updated successfully",
      });
    } catch (error) {
      console.error("Error updating telecaller remark:", error);
      return res.status(500).json({ error: "Failed to update telecaller remark" });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: "Method not allowed" });
}
