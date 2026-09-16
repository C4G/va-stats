import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const {
      id,
      coursename,
      batch,
      coursestart,
      courseend,
      coursedays,
      coursetimes,
      instructor,
      PM,
      TA,
      dataentry,
      cost,
      currency,
      strength,
      trainingmode,
      status,
    } = req.body;

    try {
      const existingStatusRows = await executeQuery({
        query: "SELECT status FROM vabatches WHERE id = ?",
        values: [id],
      });
      const previousStatusRaw = existingStatusRows?.[0]?.status ?? null;
      const previousStatus = typeof previousStatusRaw === "string" ? previousStatusRaw.trim().toUpperCase() : null;

      const normalizedStatus = typeof status === "string" && status.trim() !== "" ? status.trim().toUpperCase() : null;
      const shouldClearEnrollmentStatus = normalizedStatus === "COMPLETE" && previousStatus !== "COMPLETE";

      const query = `
        UPDATE vabatches
        SET coursename = ?, batch = ?, coursestart = ?, courseend = ?, coursedays = ?, coursetimes = ?, instructor = ?, PM = ?, TA = ?, dataentry = ?, cost = ?, currency = ?, strength = ?, trainingmode = ?, status = ?
        WHERE id = ?;
      `;

      const values = [
        coursename,
        batch,
        coursestart,
        courseend,
        coursedays,
        coursetimes,
        instructor,
        PM,
        TA,
        dataentry,
        cost,
        currency,
        strength,
        trainingmode,
        normalizedStatus,
        id,
      ];
      await executeQuery({
        query,
        values,
      });

      if (shouldClearEnrollmentStatus) {
        // Get all student IDs in this batch first, then selectively clear enrollment_status
        const studentBatchRows = await executeQuery({
          query: "SELECT student_id FROM vastudent_to_batch WHERE batch_id = ?",
          values: [id],
        });

        if (studentBatchRows && studentBatchRows.length > 0) {
          const studentIds = studentBatchRows.map((row) => row.student_id);
          const placeholders = studentIds.map(() => "?").join(",");
          await executeQuery({
            query: `
              UPDATE vastudents AS s
              SET s.enrollment_status = 'AVAILABLE'
              WHERE s.enrollment_status = 'ENROLLED'
                AND s.id IN (${placeholders})
                AND NOT EXISTS (
                  SELECT 1
                  FROM vastudent_to_batch AS sb2
                  JOIN vabatches AS b2 ON b2.id = sb2.batch_id
                  WHERE sb2.student_id = s.id
                    AND (b2.courseend IS NULL OR b2.courseend >= CURDATE())
                    AND (b2.status IS NULL OR UPPER(b2.status) <> 'COMPLETE')
                )
            `,
            values: studentIds,
          });
        }
      }

      res.status(200).json({ message: "Batch updated successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(400).json({ message: "Invalid request method" });
  }
}
