/*
  Returns trends where monthly enrollment falls in the current year.
  Groups results by month and counts the number of enrolled students per month.
*/

import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  try {
    const data = await executeQuery({
      query: `
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
      `,
      values: [],
    });

    console.log("getYearlyEnrollmentTrend - query result:", data);

    return res.status(200).json({ trend: data });
  } catch (error) {
    console.error("/api/getYearlyEnrollmentTrend error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
