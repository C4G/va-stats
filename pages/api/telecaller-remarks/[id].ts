import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-auth";

export default async function handler(req, res) {
  // Get user session for authentication
  let session: Awaited<ReturnType<typeof getServerSession>> = null;
  try {
    session = await getServerSession(req);
  } catch (sessionError) {
    console.error("Session lookup failed:", sessionError);
    return res.status(401).json({ error: "Unauthorized" });
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

  const performer = await prisma.vausers.findUnique({ where: { email: performerEmail }, select: { id: true } });
  const userId = performer?.id ?? null;
  if (!userId) {
    return res.status(404).json({ error: "User not found" });
  }

  if (req.method === "DELETE") {
    // Delete a telecaller remark (only by the user who created it)
    try {
      // Check if the remark exists and belongs to the current user
      const remarkResult = await prisma.telecaller_remarks.findUnique({
        where: { id: parseInt(id) },
        select: { user_id: true },
      });

      if (!remarkResult) {
        return res.status(404).json({ error: "Remark not found" });
      }

      if (remarkResult[0].user_id !== userId) {
        return res.status(403).json({ error: "You can only delete your own remarks" });
      }

      // Delete the remark
      await prisma.telecaller_remarks.deleteMany({ where: { id: parseInt(id), user_id: userId } });

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
      const remarkResult = await prisma.telecaller_remarks.findUnique({
        where: { id: parseInt(id) },
        select: { user_id: true },
      });

      if (!remarkResult) {
        return res.status(404).json({ error: "Remark not found" });
      }

      if (remarkResult[0].user_id !== userId) {
        return res.status(403).json({ error: "You can only edit your own remarks" });
      }

      // Update the remark
      await prisma.telecaller_remarks.updateMany({
        where: { id: parseInt(id), user_id: userId },
        data: { remark: remark.trim(), updated_at: new Date() },
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
