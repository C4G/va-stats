import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { id, course, description, duration, duration_type } = req.body;

    try {
      const query = `
        UPDATE vacourses
        SET course = ?, description = ?, duration = ?, duration_type = ?
        WHERE id = ?;
      `;

      const values = [course, description, duration, duration_type, id];
      await executeQuery({
        query,
        values,
      });

      res.status(200).json({ message: "Course updated successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(400).json({ message: "Invalid request method" });
  }
}
