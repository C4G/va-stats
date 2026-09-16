import type { NextApiRequest, NextApiResponse } from "next";
import { executeQuery } from "@/lib/db";
import type { IsPresentCode } from "@/utils/types/attendance";

type PatchRequestBody = {
  batchId?: string | number;
  studentId?: string | number;
  date?: string;
  value?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const readPatchRequestBody = (value: unknown): PatchRequestBody => {
  if (!isRecord(value)) return {};

  return {
    batchId: typeof value.batchId === "string" || typeof value.batchId === "number" ? value.batchId : undefined,
    studentId: typeof value.studentId === "string" || typeof value.studentId === "number" ? value.studentId : undefined,
    date: typeof value.date === "string" ? value.date : undefined,
    value: value.value,
  };
};

const mapValueToNumber = (value: unknown): IsPresentCode => {
  // Accept both letter codes and numeric codes as input
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 4) {
    switch (value) {
      case 0:
        return 0;
      case 1:
        return 1;
      case 2:
        return 2;
      case 3:
        return 3;
      case 4:
        return 4;
    }
  }

  const asNum = typeof value === "symbol" ? Number.NaN : Number(value);
  if (Number.isFinite(asNum) && Number.isInteger(asNum) && asNum >= 0 && asNum <= 4) {
    switch (asNum) {
      case 0:
        return 0;
      case 1:
        return 1;
      case 2:
        return 2;
      case 3:
        return 3;
      case 4:
        return 4;
    }
  }

  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  switch (v) {
    case "absent":
      return 0;
    case "present":
      return 1;
    case "cancelled":
      return 2;
    case "dropout":
      return 3;
    case "half-day":
      return 4;
    default:
      throw new Error("Invalid attendance value");
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { batchId, studentId, date, value } = readPatchRequestBody(req.body);
  const dateOnly = String(date ?? "").split("T")[0];

  // Safe parsing (accepts both letters and numbers). Returns 400 on failure
  let is_present: IsPresentCode;
  try {
    is_present = mapValueToNumber(value);
  } catch (e) {
    return res.status(400).json({ success: false, message: "Invalid attendance value" });
  }

  if (!batchId || !dateOnly || (!studentId && is_present !== 2)) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
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
