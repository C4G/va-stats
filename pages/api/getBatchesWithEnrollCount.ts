/*
  Returns batches within a specified date range.

  Supports:
  - lightweight dashboard data
  - detailed report data
  - optional inclusion of batches with zero enrolled students

  Query Params:
    startDate=YYYY-MM-DD
    endDate=YYYY-MM-DD
    includeDetails=true|false
    includeEmpty=true|false
*/

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export default async function handler(req, res) {
  try {
    const { startDate, endDate, includeDetails, includeEmpty } = req.query;

    // Validate required params
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "startDate and endDate are required",
      });
    }

    const data =
      includeDetails === "true"
        ? await prisma.$queryRaw<
            Array<{
              id: number;
              batch: string;
              coursename: string;
              trainingmode: string;
              coursestart: string;
              courseend: string;
              coursedays: string;
              status: string;
              enrolled_students: bigint;
            }>
          >(Prisma.sql`
        SELECT b.id, b.batch, b.coursename, b.trainingmode, b.coursestart, b.courseend,
          b.coursedays, b.status, COUNT(stb.student_id) AS enrolled_students
        FROM vabatches b
        LEFT JOIN vastudent_to_batch stb ON b.id = stb.batch_id
        WHERE STR_TO_DATE(b.coursestart, '%Y-%m-%d') BETWEEN ${startDate} AND ${endDate}
        GROUP BY b.id
        ${includeEmpty === "true" ? Prisma.empty : Prisma.sql`HAVING COUNT(stb.student_id) > 0`}
        ORDER BY enrolled_students DESC;
      `)
        : await prisma.$queryRaw<Array<{ id: number; batch: string; enrolled_students: bigint }>>(Prisma.sql`
        SELECT b.id, b.batch, COUNT(stb.student_id) AS enrolled_students
        FROM vabatches b
        LEFT JOIN vastudent_to_batch stb ON b.id = stb.batch_id
        WHERE STR_TO_DATE(b.coursestart, '%Y-%m-%d') BETWEEN ${startDate} AND ${endDate}
        GROUP BY b.id
        ${includeEmpty === "true" ? Prisma.empty : Prisma.sql`HAVING COUNT(stb.student_id) > 0`}
        ORDER BY enrolled_students DESC;
      `);

    return res
      .status(200)
      .json({ batches: data.map((batch) => ({ ...batch, enrolled_students: Number(batch.enrolled_students) })) });
  } catch (error) {
    console.error("/api/getBatchesWithEnrollCount error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
