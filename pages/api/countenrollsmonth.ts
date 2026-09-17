import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export default async function handler(req, res) {
  try {
    const data = await prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
        SELECT COUNT(stb.student_id) AS count
        FROM vabatches b
        JOIN vastudent_to_batch stb
          ON stb.batch_id = b.id
        WHERE YEAR(b.coursestart) = YEAR(CURDATE())
          AND QUARTER(b.coursestart) = QUARTER(CURDATE())
      `);
    res.status(200).json({ count: Number(data[0]?.count ?? BigInt(0)) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
