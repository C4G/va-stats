// pages/api/updatestudents.js
import { executeQuery } from "@/lib/db";

const ALLOWED_ENROLLMENT = new Set([
  null,
  "ENROLLED",
  "NO_RESPONSE_SW_OFF",
  "FOLLOW_UP",
  "WRONG_NUMBER",
  "DROPOUT",
  "PROSPECT",
  "COUNSELLED_BY_PM",
]);

const MAP_LABEL_TO_CODE = new Map([
  ["Unassigned", null],
  ["Enrolled", "ENROLLED"],
  ["No respond/ switched off", "NO_RESPONSE_SW_OFF"],
  ["Follow up", "FOLLOW_UP"],
  ["Wrong no", "WRONG_NUMBER"],
  ["Dropout", "DROPOUT"],
  ["Prospect", "PROSPECT"],
  ["Counselled by PM", "COUNSELLED_BY_PM"],
]);

const WHITELIST = [
  "name",
  "gender",
  "age",
  "email",
  "phone_number",
  "alt_ph_num",
  "country",
  "state",
  "city",
  "disability",
  "edu_qualifications",
  "edu_details",
  "employment_status",
  "visual_acuity",
  "percent_loss",
  "impairment_history",
  "objectives",
  "first_choice",
  "second_choice",
  "third_choice",
  "source",
  "enrollment_status",
  "Program_ManagerCoordinator",
  "first_recommendation",
  "second_recommendation",
  "third_recommendation",
  "risk_factor",
  "id_proof",
  "disability_cert",
  "photo",
  "bank_details",
  "registration_date",
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    const body = req.body;
    const studentId = Number(body.student_id ?? body.id);
    if (!Number.isFinite(studentId)) {
      return res.status(400).json({ message: "Student ID is required for update" });
    }

    const setClauses = [];
    const values = [];

    // Only allow YYYY-MM-DD for age (others are null)
    if (Object.prototype.hasOwnProperty.call(body, "age")) {
      const age = typeof body.age === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.age) ? body.age : null;
      setClauses.push("age = ?");
      values.push(age);
    }

    // Only allow YYYY-MM-DD for registration_date (others are null)
    if (Object.prototype.hasOwnProperty.call(body, "registration_date")) {
      const rd =
        typeof body.registration_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.registration_date)
          ? body.registration_date
          : null;
      setClauses.push("registration_date = ?");
      values.push(rd);
    }

    for (const key of WHITELIST) {
      if (key === "age" || key === "registration_date") continue;
      if (!Object.prototype.hasOwnProperty.call(body, key)) continue;

      if (key === "enrollment_status") {
        let v = body.enrollment_status;
        if (typeof v === "string") v = v.trim();
        if (v === "") v = null;
        if (v && !ALLOWED_ENROLLMENT.has(v)) v = MAP_LABEL_TO_CODE.get(v) ?? v;
        if (v && !ALLOWED_ENROLLMENT.has(v)) {
          return res.status(400).json({ message: "Invalid enrollment_status" });
        }
        setClauses.push("enrollment_status = ?");
        values.push(v);
      } else {
        const raw = body[key] ?? null;
        setClauses.push(`${key} = ?`);
        values.push(typeof raw === "string" ? raw.trim() : raw);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    // Debug guard (put this in during development to find the cause immediately) (undefined detected in values)
    if (values.some((v) => v === undefined)) {
      return res.status(400).json({ message: "Undefined detected in values" });
    }

    values.push(studentId);
    const firstUpdateQuery = `UPDATE vastudents SET ${setClauses.join(", ")} WHERE id = ?`;
    await executeQuery({ query: firstUpdateQuery, values });

    return res.status(200).json({ success: true, message: "Student updated successfully" });
  } catch (error) {
    console.error("updatestudents error:", error?.message, error, "body:", req.body);
    return res.status(500).json({ success: false, error: String(error?.message || error) });
  }
}
