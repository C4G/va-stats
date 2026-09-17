import { vabatches_status, vastudents_enrollment_status } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export default async function handler(req, res) {
  const { studentId, batchId } = req.body;

  try {
    await prisma.$transaction([
      prisma.va_attendance.deleteMany({ where: { batch_id: batchId, student_id: studentId } }),
      prisma.va_grades.deleteMany({ where: { batch_id: batchId, student_id: studentId } }),
      prisma.va_fees.deleteMany({ where: { batch_id: batchId, student_id: studentId } }),
      prisma.vastudent_to_batch.deleteMany({ where: { batch_id: batchId, student_id: studentId } }),
    ]);

    // Check if student is still enrolled in any current or future batch
    // If not, set enrollment_status to AVAILABLE
    try {
      const activeBatch = await prisma.vastudent_to_batch.findFirst({
        where: {
          student_id: studentId,
          vabatches: {
            courseend: { gte: new Date().toISOString().slice(0, 10) },
            status: { not: vabatches_status.COMPLETE },
          },
        },
      });

      // If student is not in any current or future batch, set enrollment_status to AVAILABLE
      if (!activeBatch) {
        await prisma.vastudents.updateMany({
          where: { id: studentId, enrollment_status: vastudents_enrollment_status.ENROLLED },
          data: { enrollment_status: vastudents_enrollment_status.AVAILABLE },
        });
      }
    } catch (error) {
      console.log("Error updating enrollment status after batch removal:", error);
      // Don't fail the request if this check fails
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
}
