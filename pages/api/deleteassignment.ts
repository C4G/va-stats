import { prisma } from "@/lib/prisma";

export default async function handler(req, res) {
  const { batchId, assignmentName } = req.body;

  try {
    await prisma.va_grades.deleteMany({ where: { batch_id: batchId, assignment_name: assignmentName } });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "An error occurred" });
  }
}
