import type { NextApiRequest, NextApiResponse } from "next";
import { vacourses_duration_type } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const {
      id,
      course,
      description,
      duration,
      duration_type,
    }: {
      id?: unknown;
      course?: unknown;
      description?: unknown;
      duration?: unknown;
      duration_type?: unknown;
    } = req.body;

    const isDurationType = (value: unknown): value is vacourses_duration_type =>
      typeof value === "string" && Object.values(vacourses_duration_type).some((item) => item === value);

    try {
      if (
        typeof id !== "number" ||
        typeof course !== "string" ||
        typeof duration !== "string" ||
        typeof duration_type !== "string" ||
        !isDurationType(duration_type)
      ) {
        return res.status(400).json({ message: "Invalid course data" });
      }

      await prisma.vacourses.update({
        where: { id },
        data: {
          course,
          description: typeof description === "string" ? description : null,
          duration,
          duration_type,
        },
      });

      res.status(200).json({ message: "Course updated successfully" });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  } else {
    res.status(400).json({ message: "Invalid request method" });
  }
}
