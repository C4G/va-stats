import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-auth";

export default async function handler(req, res) {
  // Get user session for authentication
  const session = await getServerSession(req);
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
      const results = await prisma.va_remarks.findMany({
        where: {
          vastudent_to_batch: { student_id: parseInt(student_id), batch_id: parseInt(batch_id) },
        },
        select: { id: true, remarks: true, user_id: true, vausers: { select: { name: true, email: true } } },
        orderBy: { id: "desc" },
      });

      return res
        .status(200)
        .json(
          results.map(({ vausers, ...remark }) => ({ ...remark, user_name: vausers.name, user_email: vausers.email }))
        );
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
      const studentToBatchResult = await prisma.vastudent_to_batch.findFirst({
        where: { student_id: parseInt(student_id), batch_id: parseInt(batch_id) },
        select: { id: true },
      });

      if (!studentToBatchResult) {
        return res.status(404).json({ error: "Student not found in this batch" });
      }

      const vastudentToBatchId = studentToBatchResult.id;

      // Insert the new remark
      const insertResult = await prisma.va_remarks.create({
        data: { vastudent_to_batch_id: vastudentToBatchId, remarks, user_id: Number(userId) },
      });

      return res.status(201).json({
        success: true,
        id: insertResult.id,
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
