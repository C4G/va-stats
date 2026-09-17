/*
This function is called from courses.tsx (Courses link).
It CREATES A COURSE.
*/

import type { NextApiRequest, NextApiResponse } from "next";
import { vacourses_duration_type } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CourseBody = {
  course?: unknown;
  description?: unknown;
  duration?: unknown;
  duration_type?: unknown;
};

function isDurationType(value: unknown): value is vacourses_duration_type {
  return typeof value === "string" && Object.values(vacourses_duration_type).some((item) => item === value);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const wantsJsonResponse = req.headers["content-type"]?.includes("application/json");

  try {
    // Get data submitted in request body
    const body: CourseBody = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (
      typeof body.course !== "string" ||
      typeof body.duration !== "string" ||
      typeof body.duration_type !== "string" ||
      !isDurationType(body.duration_type)
    ) {
      return res.status(400).json({ message: "Invalid course data" });
    }

    // View response object in terminal
    await prisma.vacourses.create({
      data: {
        course: body.course,
        description: typeof body.description === "string" ? body.description : null,
        duration: body.duration,
        duration_type: body.duration_type,
      },
    });
  } catch (error) {
    console.log(error);
    if (wantsJsonResponse) {
      return res.status(500).json({ message: "Failed to create course" });
    }
    res.writeHead(302, {
      Location: "/courses?error=course-create",
    });
    res.end();
    return;
  }

  if (wantsJsonResponse) {
    return res.status(200).json({ success: true });
  }

  // Redirect program flow back to Courses page
  // Thanks, Ruben Leija, for the tip that helped me here:
  // https://linguinecode.com/post/how-to-redirect-on-the-server-side-with-next-js
  res.writeHead(301, {
    Location: "/courses",
  });

  res.end();
}
