/*
This function is called from courses.jsx (Courses link).
It CREATES A COURSE.
*/

import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  try {
    // Get data submitted in request body
    const body = req.body;

    await executeQuery({
      /* ---------- DATABASE MODIFICATION SECTION ------------- */
      // If timestamp is a field, use: user.createdAt.Date (not toString)
      query: "DELETE FROM vabatches WHERE id = ?",
      values: [body.id],
    });
    res.status(200).json({ message: "Batch deleted successfully" });
    res.end();
  } catch (error) {
    console.log(error);
  }
  // Redirect program flow back to Courses page
  // Thanks, Ruben Leija, for the tip that helped me here:
  // https://linguinecode.com/post/how-to-redirect-on-the-server-side-with-next-js
  // res.writeHead(301, {
  // 	Location: '/batches',
  // });

  // res.end();
}
