import {
  vabatches_currency,
  vabatches_status,
  vabatches_trainingmode,
  vastudents_enrollment_status,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const isBatchStatus = (value: unknown): value is vabatches_status =>
  typeof value === "string" && Object.values(vabatches_status).some((item) => item === value);
const isTrainingMode = (value: unknown): value is vabatches_trainingmode =>
  typeof value === "string" && Object.values(vabatches_trainingmode).some((item) => item === value);
const isCurrency = (value: unknown): value is vabatches_currency =>
  typeof value === "string" && Object.values(vabatches_currency).some((item) => item === value);

export default async function handler(req, res) {
  if (req.method === "POST") {
    const {
      id,
      coursename,
      batch,
      coursestart,
      courseend,
      coursedays,
      coursetimes,
      instructor,
      PM,
      TA,
      dataentry,
      cost,
      currency,
      strength,
      trainingmode,
      status,
    } = req.body;

    try {
      const existingBatch = await prisma.vabatches.findUnique({ where: { id }, select: { status: true } });
      if (!existingBatch) return res.status(404).json({ error: "Batch not found" });
      const previousStatus = existingBatch.status;

      const normalizedStatus = typeof status === "string" && status.trim() !== "" ? status.trim().toUpperCase() : null;
      if (!isBatchStatus(normalizedStatus) || !isTrainingMode(trainingmode)) {
        return res.status(400).json({ error: "Invalid batch status or training mode" });
      }
      await prisma.vabatches.update({
        where: { id },
        data: {
          coursename,
          batch,
          coursestart,
          courseend,
          coursedays,
          coursetimes,
          instructor,
          PM,
          TA,
          dataentry,
          cost,
          currency: isCurrency(currency) ? currency : null,
          strength,
          trainingmode,
          status: normalizedStatus,
        },
      });

      if (normalizedStatus === vabatches_status.COMPLETE && previousStatus !== vabatches_status.COMPLETE) {
        const memberships = await prisma.vastudent_to_batch.findMany({
          where: { batch_id: id },
          select: { student_id: true },
        });
        for (const { student_id } of memberships) {
          if (student_id == null) continue;
          const activeBatch = await prisma.vastudent_to_batch.findFirst({
            where: {
              student_id,
              vabatches: {
                status: { not: vabatches_status.COMPLETE },
                courseend: { gte: new Date().toISOString().slice(0, 10) },
              },
            },
          });
          if (!activeBatch) {
            await prisma.vastudents.updateMany({
              where: { id: student_id, enrollment_status: vastudents_enrollment_status.ENROLLED },
              data: { enrollment_status: vastudents_enrollment_status.AVAILABLE },
            });
          }
        }
      }

      res.status(200).json({ message: "Batch updated successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(400).json({ message: "Invalid request method" });
  }
}
