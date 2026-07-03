import { executeQuery } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  // Get user session for authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "Remark ID is required" });
  }

  if (req.method === "DELETE") {
    // Delete a va remark (only by the user who created it)
    try {
      // Get user ID from session
      const userId = session?.user?.id;

      if (!userId) {
        return res.status(404).json({ error: "User ID not found in session" });
      }

      // Check if the remark exists and belongs to the current user
      const remarkResult = await executeQuery({
        query: "SELECT id, user_id FROM va_remarks WHERE id = ?",
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
        query: "DELETE FROM va_remarks WHERE id = ? AND user_id = ?",
        values: [parseInt(id), userId],
      });

      return res.status(200).json({
        success: true,
        message: "VA remark deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting va remark:", error);
      return res.status(500).json({ error: "Failed to delete va remark" });
    }
  }

  if (req.method === "PATCH") {
    // Update a va remark (only by the user who created it)
    const { remarks } = req.body;

    if (!remarks || !remarks.trim()) {
      return res.status(400).json({ error: "Remark content is required" });
    }

    try {
      // Get user ID from session
      const userId = session?.user?.id;

      if (!userId) {
        return res.status(404).json({ error: "User ID not found in session" });
      }

      // Check if the remark exists and belongs to the current user
      const remarkResult = await executeQuery({
        query: "SELECT id, user_id FROM va_remarks WHERE id = ?",
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
        query: "UPDATE va_remarks SET remarks = ? WHERE id = ? AND user_id = ?",
        values: [remarks.trim(), parseInt(id), userId],
      });

      return res.status(200).json({
        success: true,
        message: "VA remark updated successfully",
      });
    } catch (error) {
      console.error("Error updating va remark:", error);
      return res.status(500).json({ error: "Failed to update va remark" });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: "Method not allowed" });
}
