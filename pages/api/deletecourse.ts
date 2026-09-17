/*
This function is called from courses.tsx (Courses link).
It CREATES A COURSE.
*/

import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get data submitted in request body
    const body: { id?: unknown } = req.body;

    // View response object in terminal
    console.log("body: ", body);
    if (typeof body.id !== "number") return res.status(400).json({ message: "Invalid course id" });

    await prisma.vacourses.delete({ where: { id: body.id } });
    res.status(200).json({ message: "Course deleted successfully" });
    res.end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
  // Redirect program flow back to Courses page
  // Thanks, Ruben Leija, for the tip that helped me here:
  // https://linguinecode.com/post/how-to-redirect-on-the-server-side-with-next-js
  // res.writeHead(301, {
  // 	Location: '/batches',
  // });

  // res.end();
}
