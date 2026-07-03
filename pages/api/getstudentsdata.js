/*
This function is called from students.jsx (Students link).
student registration form.
*/

import { executeQuery } from "@/lib/db";
import { normalizeDateValue } from "@/utils/date-normalizers";

const ALLOWED_CODES = new Set([
  "ENROLLED",
  "NO_RESPONSE_SW_OFF",
  "FOLLOW_UP",
  "WRONG_NUMBER",
  "DROPOUT",
  "PROSPECT",
  "COUNSELLED_BY_PM",
]);

const DB_LABEL_TO_CODE = new Map([
  ["Enrolled", "ENROLLED"],
  ["No respond/ switched off", "NO_RESPONSE_SW_OFF"],
  ["Follow up", "FOLLOW_UP"],
  ["Wrong no", "WRONG_NUMBER"],
  ["Dropout", "DROPOUT"],
  ["Prospect", "PROSPECT"],
  ["Counselled by PM", "COUNSELLED_BY_PM"],
  ["Available", "AVAILABLE"],
]);

function toCode(v) {
  if (v == null) return null;
  const t = String(v).trim();
  if (t === "") return null;
  if (ALLOWED_CODES.has(t)) return t; // Already a code? Pass through
  return DB_LABEL_TO_CODE.get(t) ?? null; // Label? Convert to code, or null
}

export default async function handler(req, res) {
  // Set cache headers to improve performance
  // Students data changes frequently, so shorter cache than batches
  res.setHeader("Cache-Control", "private, max-age=30, stale-while-revalidate=60");

  try {
    const query = `
                    SELECT s.id,
                          s.enrollment_status AS enrollment_status,
                          s.Quarter,
                          s.SNo,
                          s.Batch_ID,
                          s.Program_Name,
                          s.Trainee_ID,
                          s.name,
                          s.edu_qualifications,
                          s.phone_number,
                          s.alt_ph_num,
                          s.CityDistrict_State,
                          s.email,
                          s.gender,
                          s.age,
                          s.visual_acuity,
                          s.percent_loss,
                          s.employment_status,
                          s.Designation,
                          s.Languages_Known,
                          s.Program_ManagerCoordinator,
                          s.first_recommendation,        
                          s.second_recommendation,       
                          s.third_recommendation,       
                          s.country,
                          s.state,
                          s.city,
                          s.disability,
                          s.edu_details,
                          s.objectives,
                          s.first_choice,
                          s.second_choice,
                          s.third_choice,
                          s.impairment_history,
                          s.source,
                          s.registration_date,
                          s.id_proof,
                          s.disability_cert,
                          s.photo,
                          s.bank_details,
                          s.completion_status,
                          s.reason_for_status,
                          s.certification_eligibility,
                          s.risk_factor,
                          s.remarks AS remarks_raw,
                          s.commenter,
                          MAX(s.last_edited) AS last_edited,
                          GROUP_CONCAT(DISTINCT CONCAT(u.name, ': ', r.remarks) SEPARATOR ' || ') AS remarks,
                          GROUP_CONCAT(DISTINCT CONCAT(u2.name, ': ', tr.remark) SEPARATOR ' || ') AS telecaller_remarks
                    FROM vastudents as s
                    LEFT JOIN vastudent_to_batch as sb ON s.id = sb.student_id
                    LEFT JOIN va_remarks as r ON sb.id = r.vastudent_to_batch_id
                    LEFT JOIN vausers as u ON r.user_id = u.id
                    LEFT JOIN telecaller_remarks as tr ON s.id = tr.student_id
                    LEFT JOIN vausers as u2 ON tr.user_id = u2.id
                    GROUP BY s.id
                    ORDER BY last_edited DESC;
                  `;

    let students = await executeQuery({ query });

    students = students.map((s) => ({
      ...s,
      enrollment_status: toCode(s.enrollment_status),
      age: normalizeDateValue(s.age),
      registration_date: normalizeDateValue(s.registration_date),
    }));
    res.status(200).json({ students });
  } catch (error) {
    console.error("Error fetching students data:", error);
    if (process.env.NODE_ENV === "development") {
      console.error("Error stack:", error.stack);
    }
    return res.status(500).json({
      error: String(error?.message || error),
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
