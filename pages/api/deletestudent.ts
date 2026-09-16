import { executeQuery } from "@/lib/db";

export default async function deleteStudent(req, res) {
  try {
    const { id } = req.body;

    try {
      const query = `
        DELETE FROM vastudents
        WHERE id = ?;
      `;

      const values = [id];
      await executeQuery({ query, values });
      res.status(200).json({ message: "Student deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } catch (error) {
    res.status(400).json({ message: "Invalid request method" });
  }
}
