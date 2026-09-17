import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DocumentRow = {
  id: number;
  name: string | null;
  id_proof: string;
  disability_cert: string;
  photo: string;
  bank_details: string;
};

export default async function handler(req, res) {
  const { batch_id } = req.body;
  const batchId = Number(batch_id);

  if (!Number.isInteger(batchId) || batchId <= 0) {
    return res.status(400).json({ error: "Invalid batch_id" });
  }

  try {
    const [documentsData, feesData, courseAndBatchNameData] = await Promise.all([
      // Legacy rows can contain '' in these columns even though the current Prisma
      // schema models valid values as YesNo. Keep this projection typed and
      // parameterized while those legacy values are still present.
      prisma.$queryRaw<DocumentRow[]>(Prisma.sql`
        SELECT s.id, s.name, s.id_proof, s.disability_cert, s.photo, s.bank_details
        FROM vastudents s
        JOIN vastudent_to_batch sb ON sb.student_id = s.id
        WHERE sb.batch_id = ${batchId}
      `),
      prisma.va_fees.findMany({
        where: { batch_id: batchId },
        select: {
          student_id: true,
          fee_paid: true,
          amount_1: true,
          amount_2: true,
          amount_3: true,
          nature_of_fee: true,
        },
      }),
      prisma.vabatches.findUnique({ where: { id: batchId }, select: { coursename: true, batch: true } }),
    ]);

    res.status(200).json({
      documents: documentsData,
      fees: feesData,
      coursename: courseAndBatchNameData?.coursename ?? null,
      batch: courseAndBatchNameData?.batch ?? null,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
