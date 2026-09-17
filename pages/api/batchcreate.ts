/*
This function is called from batches.tsx (Batches link).
It CREATES A NEW BATCH.
*/

import { vabatches_currency, vabatches_status, vabatches_trainingmode } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const isCurrency = (value: unknown): value is vabatches_currency =>
  typeof value === "string" && Object.values(vabatches_currency).some((item) => item === value);
const isTrainingMode = (value: unknown): value is vabatches_trainingmode =>
  typeof value === "string" && Object.values(vabatches_trainingmode).some((item) => item === value);

export default async function handler(req, res) {
  try {
    // Get data submitted in request body
    const body = req.body;

    // Check if batch ID already exists
    if (body.batch) {
      const existingBatch = await prisma.vabatches.findFirst({
        where: { batch: body.batch.trim() },
        select: { id: true },
      });

      if (existingBatch) {
        return res.status(400).json({
          success: false,
          message: "Batch ID already exists. Please use a different Batch ID.",
        });
      }
    }

    // View response object in terminal
    var coursedays;
    if (Array.isArray(body.coursedays)) {
      coursedays = body.coursedays.join("");
    } else {
      coursedays = body.coursedays;
    }
    if (!isTrainingMode(body.trainingmode)) {
      return res.status(400).json({ success: false, message: "Invalid training mode" });
    }
    const result = await prisma.vabatches.create({
      data: {
        coursename: body.coursename || "",
        batch: body.batch || "",
        coursestart: body.coursestart || "",
        courseend: body.courseend || "",
        coursedays: coursedays || "",
        coursetimes: (body.coursetimestart ? body.coursetimestart + " - " + (body.coursetimeend || "") : "") || "",
        instructor: body.instructor || "",
        PM: body.PM || "",
        TA: body.TA || "",
        dataentry: body.dataentry || "",
        cost: body.cost || null,
        currency: isCurrency(body.currency) ? body.currency : null,
        strength: body.strength || 0,
        trainingmode: body.trainingmode,
        status: vabatches_status.UNSTARTED,
      },
    });
    res.status(200).json({ success: true, batchId: result.id });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
}
