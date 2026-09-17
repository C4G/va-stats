/*
This function is called from index.tsx to count number of students for overall stats
*/

import { prisma } from "@/lib/prisma";

export default async function handler(_req, res) {
  try {
    const count = await prisma.vastudents.count();
    res.status(200).json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
