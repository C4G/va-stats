import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  // Set cache headers to improve performance
  // Courses data changes infrequently, so longer cache than students
  res.setHeader("Cache-Control", "private, max-age=300, stale-while-revalidate=600");

  try {
    const courses = await prisma.vacourses.findMany({
      select: { id: true, course: true, description: true, duration: true, duration_type: true },
      orderBy: { course: "asc" },
    });
    res.status(200).json({ courses });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
