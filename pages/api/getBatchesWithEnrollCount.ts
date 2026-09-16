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

import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  try {
    const { startDate, endDate, includeDetails, includeEmpty } = req.query;

    // Validate required params
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "startDate and endDate are required",
      });
    }

    // Select fields dynamically depending on use case
    const selectFields =
      includeDetails === "true"
        ? `
          b.id,
          b.batch,
          b.coursename,
          b.trainingmode,
          b.coursestart,
          b.courseend,
          b.coursedays,
          b.status,
          COUNT(stb.student_id) AS enrolled_students
        `
        : `
          b.id,
          b.batch,
          COUNT(stb.student_id) AS enrolled_students
        `;

    // Dashboard excludes empty batches by default
    // Reports can include them with includeEmpty=true
    const havingClause = includeEmpty === "true" ? "" : "HAVING COUNT(stb.student_id) > 0";

    const data = await executeQuery({
      query: `
        SELECT 
          ${selectFields}
        FROM vabatches b
        LEFT JOIN vastudent_to_batch stb 
          ON b.id = stb.batch_id
        WHERE 
          STR_TO_DATE(b.coursestart, '%Y-%m-%d') 
            BETWEEN ? AND ?
        GROUP BY b.id
        ${havingClause}
        ORDER BY enrolled_students DESC;
      `,
      values: [startDate, endDate],
    });

    console.log("getBatchesWithEnrollCount - query result:", data);

    return res.status(200).json({ batches: data });
  } catch (error) {
    console.error("/api/getBatchesWithEnrollCount error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
