/*
  Returns trends where monthly enrollment falls in the current year.
  Groups results by month and counts the number of enrolled students per month.
*/

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export default async function handler(req, res) {
  try {
    const data = await prisma.$queryRaw<Array<{ month_number: number; month: string; enrollments: bigint }>>(Prisma.sql`
        SELECT
          MONTH(b.coursestart) AS month_number,
          DATE_FORMAT(b.coursestart, '%b') AS month,
          COUNT(stb.student_id) AS enrollments
        FROM vabatches b
        JOIN vastudent_to_batch stb
          ON b.id = stb.batch_id
        WHERE
          YEAR(b.coursestart) = YEAR(CURDATE())
        GROUP BY
          MONTH(b.coursestart),
          DATE_FORMAT(b.coursestart, '%b')
        ORDER BY
          MONTH(b.coursestart);
      `);

    return res.status(200).json({ trend: data.map((row) => ({ ...row, enrollments: Number(row.enrollments) })) });
  } catch (error) {
    console.error("/api/getYearlyEnrollmentTrend error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
