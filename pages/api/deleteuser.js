import { executeQuery } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { staffAuditLogger } from "../../utils/auditLogger";
import { authOptions } from "./auth/[...nextauth]";

export default async function deleteUser(req, res) {
  if (req.method !== "POST") {
    return res.status(400).json({ message: "Invalid request method" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    try {
      const performerData = await executeQuery({
        query: "SELECT id FROM vausers WHERE email = ?",
        values: [session?.user?.email],
      });
      const performerId = performerData?.[0]?.id || "Unknown User";

      const userData = await executeQuery({
        query: "SELECT * FROM vausers WHERE id = ?",
        values: [id],
      });

      if (!userData || userData.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const deleteRemarksResult = await executeQuery({
        query: "DELETE FROM va_remarks WHERE user_id = ?",
        values: [id],
      });

      const deleteUserResult = await executeQuery({
        query: "DELETE FROM vausers WHERE id = ?",
        values: [id],
      });
      try {
        // Log the staff creation
        await staffAuditLogger.logStaffDeletion(performerId, id, userData[0]);
      } catch (auditError) {
        console.error("Audit logger threw:", auditError.message);
        console.error("Audit stack:", auditError.stack);
      }

      return res.status(200).json({
        message: "User and related records deleted successfully",
        remarksDeleted: deleteRemarksResult.affectedRows,
        userDeleted: deleteUserResult.affectedRows,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Database error occurred",
        details: error.message,
        code: error.code,
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Server error occurred",
      details: error.message,
      code: error.code,
    });
  }
}
