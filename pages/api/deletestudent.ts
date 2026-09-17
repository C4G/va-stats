import { prisma } from "@/lib/prisma";

export default async function deleteStudent(req, res) {
  try {
    const { id } = req.body;

    try {
      await prisma.vastudents.delete({ where: { id } });
      res.status(200).json({ message: "Student deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  } catch (error) {
    res.status(400).json({ message: "Invalid request method" });
  }
}
