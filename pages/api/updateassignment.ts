import { prisma } from "@/lib/prisma";

export default async function handler(req, res) {
  const body = req.body;
  const assignmentData = body.assignmentData;

  try {
    await prisma.va_grades.updateMany({
      where: { batch_id: body.batchId, assignment_name: assignmentData.id },
      data: {
        assignment_name: assignmentData.assignment_name,
        assignment_type: assignmentData.assignment_type,
        assignment_weight: assignmentData.assignment_weight,
        max_marks: assignmentData.max_marks,
      },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
}
