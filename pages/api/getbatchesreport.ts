import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { startDate, endDate } = req.body;

  try {
    // Query to get batch data with student counts and collected fees
    const query = `
      SELECT 
        b.id,
        b.coursename,
        b.batch,
        b.coursestart,
        b.courseend,
        b.instructor,
        b.PM,
        b.TA,
        b.dataentry,
        b.status,
        COUNT(DISTINCT sb.student_id) as total_students,
        COALESCE(SUM(df.amount_1 + df.amount_2 + df.amount_3), 0) as collected_fees
      FROM vabatches b
      LEFT JOIN vastudent_to_batch sb ON b.id = sb.batch_id
      LEFT JOIN vadocuments_fee df ON sb.id = df.vastudent_to_batch_id
      WHERE b.coursestart >= ? AND b.courseend <= ?
      GROUP BY b.id
      ORDER BY b.coursestart DESC
    `;

    const data = await executeQuery({
      query,
      values: [startDate, endDate],
    });

    res.status(200).json({ batches: data });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
