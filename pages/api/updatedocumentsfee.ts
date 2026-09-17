import { prisma } from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const {
      id,
      id_proof,
      disability_cert,
      photo,
      bank_details,
      fee_paid,
      amount_1,
      amount_2,
      amount_3,
      nature_of_fee,
    } = req.body.studentData;
    try {
      await prisma.$transaction([
        prisma.vastudents.update({
          where: { id },
          data: { id_proof, disability_cert, photo, bank_details },
        }),
        prisma.va_fees.updateMany({
          where: { batch_id: req.body.batchId, student_id: id },
          data: { fee_paid, amount_1, amount_2, amount_3, nature_of_fee },
        }),
      ]);
      res.status(200).json({ message: "Student updated successfully" });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  } else {
    res.status(400).json({ message: "Invalid request method" });
  }
}
