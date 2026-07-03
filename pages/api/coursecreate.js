/*
This function is called from courses.jsx (Courses link).
It CREATES A COURSE.
*/

import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const wantsJsonResponse = req.headers["content-type"]?.includes("application/json");

  try {
    // Get data submitted in request body
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // View response object in terminal
    await executeQuery({
      /* ---------- DATABASE MODIFICATION SECTION ------------- */
      // If timestamp is a field, use: user.createdAt.Date (not toString)
      query: "INSERT INTO vacourses (id, course, description, duration, duration_type) VALUES (?, ?, ?, ?, ?)",
      values: ["", body.course, body.description, body.duration, body.duration_type],
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
