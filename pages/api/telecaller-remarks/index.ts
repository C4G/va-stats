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

      const results = await prisma.telecaller_remarks.findMany({
        where: { student_id: studentId },
        select: {
          id: true,
          remark: true,
          created_at: true,
          updated_at: true,
          vausers: { select: { name: true, email: true } },
        },
        orderBy: { created_at: "desc" },
      });

      return res
        .status(200)
        .json(
          results.map(({ vausers, ...result }) => ({ ...result, user_name: vausers.name, user_email: vausers.email }))
        );
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

      const performer = await prisma.vausers.findUnique({ where: { email: performerEmail }, select: { id: true } });
      const userId = performer?.id ?? null;
      if (!userId) {
        return res.status(404).json({ error: "User not found" });
      }

      // Insert the new remark
      const insertResult = await prisma.telecaller_remarks.create({
        data: { student_id: parseInt(student_id), user_id: userId, remark },
      });

      return res.status(201).json({
        success: true,
        id: insertResult.id,
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
