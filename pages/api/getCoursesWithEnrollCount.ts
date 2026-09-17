/*
  Returns courses where the course start date falls in the current quarter.
  Groups results by coursename and counts the number of enrolled students for each course.
*/

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export default async function handler(req, res) {
  try {
    const data = await prisma.$queryRaw<Array<{ coursename: string; enrolled_students: bigint }>>(Prisma.sql`
        SELECT b.coursename, COUNT(stb.student_id) AS enrolled_students
        FROM vabatches b
        JOIN vastudent_to_batch stb ON b.id = stb.batch_id
        WHERE QUARTER(b.coursestart) = QUARTER(CURDATE()) AND YEAR(b.coursestart) = YEAR(CURDATE())
        GROUP BY b.coursename
        HAVING COUNT(stb.student_id) > 0
        ORDER BY enrolled_students DESC;
      `);

    return res
      .status(200)
      .json({ courses: data.map((course) => ({ ...course, enrolled_students: Number(course.enrolled_students) })) });
  } catch (error) {
    console.error("/api/getCoursesWithEnrollCount error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
