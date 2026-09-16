/*
  Returns courses where the course start date falls in the current quarter.
  Groups results by coursename and counts the number of enrolled students for each course.
*/

import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  try {
    const data = await executeQuery({
      query: `
        SELECT 
          b.coursename,
          COUNT(stb.student_id) AS enrolled_students
        FROM vabatches b
        JOIN vastudent_to_batch stb 
          ON b.id = stb.batch_id
        WHERE 
          (QUARTER(b.coursestart) = QUARTER(CURDATE()) AND YEAR(b.coursestart) = YEAR(CURDATE()))
        GROUP BY b.coursename
        HAVING COUNT(stb.student_id) > 0
        ORDER BY enrolled_students DESC;
      `,
      values: [],
    });

    console.log("getCoursesWithEnrollCount - query result:", data);

    return res.status(200).json({ courses: data });
  } catch (error) {
    console.error("/api/getCoursesWithEnrollCount error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
