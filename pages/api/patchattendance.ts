import type { NextApiRequest, NextApiResponse } from "next";
import { executeQuery } from "@/lib/db";
import type { AttendanceSymbol, IsPresentCode, PatchAttendanceBody } from "@/utils/types/attendance";

const mapValueToNumber = (value: unknown): IsPresentCode => {
  // Accept both letter codes and numeric codes as input
  const raw = value as any;
  if (raw === 0 || raw === 1 || raw === 2 || raw === 3 || raw === 4) return raw as IsPresentCode;
  const asNum = Number(raw);
  if (Number.isFinite(asNum) && [0, 1, 2, 3, 4].includes(asNum)) return asNum as IsPresentCode;
  const v = String(value ?? "")
    .trim()
    .toUpperCase() as AttendanceSymbol;
  switch (v) {
    case "Absent":
      return 0;
    case "Present":
      return 1;
    case "Cancelled":
      return 2;
    case "Dropout":
      return 3;
    case "Half-day":
      return 4;
    default:
      throw new Error("Invalid attendance value");
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { batchId, studentId, date, value } = (req.body as PatchAttendanceBody) ?? {};
  const dateOnly = String(date ?? "").split("T")[0];

  // Safe parsing (accepts both letters and numbers). Returns 400 on failure
  let parsed: IsPresentCode | null = null;
  try {
    parsed = mapValueToNumber(value);
  } catch (e) {
    return res.status(400).json({ success: false, message: "Invalid attendance value" });
  }

  if (!batchId || !dateOnly || (!studentId && parsed !== 2)) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const is_present = parsed as IsPresentCode;

    console.log("[PATCHATTENDANCE] Received data:", { batchId, studentId, dateOnly, value, is_present });

    if (is_present === 2) {
      // X(Cancelled): Update existing rows in batch, then INSERT only for students without records (NOT EXISTS)
      await executeQuery({
        query: `UPDATE va_attendance
                SET is_present = ?
                WHERE batch_id = ? AND date = ?`,
        values: [is_present, batchId, dateOnly],
      });

      await executeQuery({
        query: `
          INSERT INTO va_attendance (batch_id, student_id, date, is_present)
          SELECT sb.batch_id, sb.student_id, ?, ?
          FROM vastudent_to_batch sb
          WHERE sb.batch_id = ?
            AND NOT EXISTS (
              SELECT 1 FROM va_attendance va
              WHERE va.batch_id = sb.batch_id
                AND va.student_id = sb.student_id
                AND va.date = ?
            )
        `,
        values: [dateOnly, is_present, batchId, dateOnly],
      });

      return res
        .status(200)
        .json({ success: true, message: "Class marked as cancelled for all students on this date." });
    }

    if (is_present === 3) {
      console.log("[PATCHATTENDANCE] Processing dropout for student:", studentId);

      // Dropout: Update student's enrollment status to 'DROPOUT' in vastudents table
      const enrollmentResult = await executeQuery({
        query: `UPDATE vastudents 
                SET enrollment_status = 'DROPOUT' 
                WHERE id = ?`,
        values: [studentId],
      });
      console.log("[PATCHATTENDANCE] Enrollment status update result:", enrollmentResult);

      // Update attendance records for this student in this batch from the dropout date onwards
      // NOTE: This assumes the batch_id, student_id, and date exist in the database, so if it doesn't for any reason,
      //       the query won't update the cell(s) for this record.
      // NOTE: This shouldn't be an issue for newer batches, but if any issues emerge with dropout not working well, check if
      //       the records appears in the database.
      const attendanceResult = await executeQuery({
        query: `UPDATE va_attendance 
                SET is_present = ? 
                WHERE batch_id = ? AND student_id = ? AND date >= ?`,
        values: [is_present, batchId, studentId, dateOnly],
      });
      console.log("[PATCHATTENDANCE] Attendance update result:", attendanceResult);

      return res
        .status(200)
        .json({ success: true, message: "Student marked as dropped from the specified date onwards!" });
    }

    // Normal P/A/H: UPDATE → (if not exists) INSERT (works without unique key constraints)
    const updateRes: any = await executeQuery({
      query: `UPDATE va_attendance
              SET is_present = ?
              WHERE batch_id = ? AND student_id = ? AND date = ?`,
      values: [is_present, batchId, studentId, dateOnly],
    });
    if ((updateRes?.affectedRows ?? 0) === 0) {
      await executeQuery({
        query: `INSERT INTO va_attendance (batch_id, student_id, date, is_present)
                VALUES (?, ?, ?, ?)`,
        values: [batchId, studentId, dateOnly, is_present],
      });
    }

    return res.status(200).json({
      success: true,
      message: is_present === 4 ? "Half-day saved." : "Attendance updated successfully!",
    });
  } catch (error: any) {
    console.error("Error in patchattendance handler:", error);
    return res.status(500).json({ success: false, message: error?.message || "Error in patch attendance handler" });
  }
}
