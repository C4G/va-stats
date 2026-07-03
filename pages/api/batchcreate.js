/*
This function is called from batches.jsx (Batches link).
It CREATES A NEW BATCH.
*/

import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  try {
    // Get data submitted in request body
    const body = req.body;

    // Check if batch ID already exists
    if (body.batch) {
      const existingBatch = await executeQuery({
        query: "SELECT id FROM vabatches WHERE batch = ?",
        values: [body.batch.trim()],
      });

      if (existingBatch && existingBatch.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Batch ID already exists. Please use a different Batch ID.",
        });
      }
    }

    // View response object in terminal
    var coursedays;
    if (Array.isArray(body.coursedays)) {
      coursedays = body.coursedays.join("");
    } else {
      coursedays = body.coursedays;
    }
    const result = await executeQuery({
      /* ---------- DATABASE MODIFICATION SECTION ------------- */
      // If timestamp is a field, use: user.createdAt.Date (not toString)
      // NOTE: coursedays does is not a property of 'body' in query below;
      // Do not use body.coursedays just use coursedays
      query:
        "INSERT INTO vabatches (id, coursename, batch, coursestart, courseend, coursedays, coursetimes, instructor, PM, TA, dataentry, cost, currency, strength, trainingmode, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      values: [
        null,
        body.coursename || "",
        body.batch || "",
        body.coursestart || "",
        body.courseend || "",
        coursedays || "",
        (body.coursetimestart ? body.coursetimestart + " - " + (body.coursetimeend || "") : "") || "",
        body.instructor || "",
        body.PM || "",
        body.TA || "",
        body.dataentry || "",
        body.cost || null,
        body.currency || null,
        body.strength || 0,
        body.trainingmode || "",
        "UNSTARTED",
      ],
    });
    res.status(200).json({ success: true, batchId: result.insertId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
}
