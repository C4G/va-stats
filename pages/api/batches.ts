/*
This function is called from the Courses page (/courses.tsx).
It executes the query that SHOWS CURRENT COURSES (?CURRENT BATCHES).
*/

import { prisma } from "@/lib/prisma";

export default async function assetHandler(req, res) {
  const { method } = req;
  switch (method) {
    case "GET":
      try {
        const result = await prisma.vabatches.findMany();
        res.json(result);
        return result;
      } catch (e) {
        console.error("Request error", e);
        res.status(500).json({ error: "Error fetching batches" });
      }
    default:
      res.setHeader("Allow", ["GET"]);
      break;
  }
}
