import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  try {
    const data = await executeQuery({
      query: `
        SELECT COUNT(stb.student_id)
        FROM vabatches b
        JOIN vastudent_to_batch stb
          ON stb.batch_id = b.id
        WHERE YEAR(b.coursestart) = YEAR(CURDATE())
          AND QUARTER(b.coursestart) = QUARTER(CURDATE())
      `,
      values: [],
    });
    res.status(200).json({ count: data[0]["COUNT(stb.student_id)"] });
    res.end();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
}
