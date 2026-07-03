import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  // Set cache headers to improve performance
  // Courses data changes infrequently, so longer cache than students
  res.setHeader("Cache-Control", "private, max-age=300, stale-while-revalidate=600");

  try {
    const query = "SELECT id, course, description, duration, duration_type FROM vacourses ORDER BY course ASC";

    const values = [];
    const data = await executeQuery({ query, values });
    res.status(200).json({ courses: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
