import { prisma } from "@/lib/prisma";

export default async function handler(_req, res) {
  try {
    const courses = await prisma.vacourses.findMany({ select: { course: true } });
    res.status(200).json({ courses });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
