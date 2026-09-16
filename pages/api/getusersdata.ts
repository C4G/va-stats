import { executeQuery } from "@/lib/db";
import { normalizeUserDates } from "@/utils/date-normalizers";

export default async function handler(req, res) {
  try {
    const query = `SELECT 
      id,
      employeeId,
      email,
      name,
      designation,
      DATE_FORMAT(joindate, '%Y-%m-%d') AS joindate,
      mobilenumber,
      workbase,
      supervisor,
      natureofjob,
      visualacuity,
      role,
      isactive,
      gender,
      DATE_FORMAT(date_of_birth, '%Y-%m-%d') AS date_of_birth,
      contract_duration_months,
      program_project,
      DATE_FORMAT(lastlogin, '%Y-%m-%d') AS lastlogin,
      trainingprogram1,
      trainingprogram2,
      trainingprogram3 
    FROM vausers 
    ORDER BY name ASC`;

    const data = await executeQuery({
      query,
    });

    const normalized = normalizeUserDates(data);
    res.status(200).json({ users: normalized });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
