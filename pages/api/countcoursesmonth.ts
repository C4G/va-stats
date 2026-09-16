import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  try {
    const data = await executeQuery({
      query: `
        SELECT COUNT(*)
        FROM vabatches b
        WHERE TRIM(COALESCE(b.coursename, '')) <> ''
          AND YEAR(b.coursestart) = YEAR(CURDATE())
          AND QUARTER(b.coursestart) = QUARTER(CURDATE())
      `,
      values: [],
    });
    res.status(200).json({ count: data[0]["COUNT(*)"] });
    res.end();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
}
