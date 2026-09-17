import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-auth";
import { staffAuditLogger } from "../../utils/auditLogger";

export default async function deleteUser(req, res) {
  if (req.method !== "POST") {
    return res.status(400).json({ message: "Invalid request method" });
  }

  try {
    const session = await getServerSession(req);
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    try {
      const performer = session?.user?.email
        ? await prisma.vausers.findUnique({ where: { email: session.user.email }, select: { id: true } })
        : null;
      const performerId = performer?.id || "Unknown User";

      const userData = await prisma.vausers.findUnique({ where: { id }, include: { va_remarks: true } });

      if (!userData) {
        return res.status(404).json({ message: "User not found" });
      }

      const [deleteRemarksResult, deleteUserResult] = await prisma.$transaction([
        prisma.va_remarks.deleteMany({ where: { user_id: id } }),
        prisma.vausers.delete({ where: { id } }),
      ]);
      const { va_remarks: _remarks, ...deletedUser } = userData;
      try {
        await staffAuditLogger.logStaffDeletion(performerId, id, deletedUser);
      } catch (auditError) {
        console.error("Audit logger threw:", auditError instanceof Error ? auditError.message : String(auditError));
        console.error("Audit stack:", auditError instanceof Error ? auditError.stack : undefined);
      }

      return res.status(200).json({
        message: "User and related records deleted successfully",
        remarksDeleted: deleteRemarksResult.count,
        userDeleted: deleteUserResult ? 1 : 0,
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
