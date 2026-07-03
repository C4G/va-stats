import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  try {
    /* ---------------- DATA MODIFICATION SECTION --------------- */
    const query = "SELECT course FROM vacourses";
    // const query = SELECT JSON_ARRAYAGG(JSON_OBJECT('course', course)) from vacourses;
    // const query = SELECT CONCAT('[', GROUP_CONCAT(JSON_OBJECT('course', course)),']') FROM vacourses;
    // const query = SELECT json_object: any('course', course) FROM vacourses;
    // const query = "SELECT json_object('course', course) FROM vacourses";

    const values = [];
    const data = await executeQuery({
      query,
      values,
    });
    res.status(200).json({ courses: data });
    // res.send(data);   // TRY
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
