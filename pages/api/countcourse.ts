import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<{ count: number } | { error: string }>
) {
  try {
    const count = await prisma.vacourses.count();
    res.status(200).json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
