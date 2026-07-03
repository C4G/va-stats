// FILE CONTENTS: MySQL Courses table query

import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  try {
    if (!req.body || !req.body.email) {
      return res.status(400).json({ error: "Email is required" });
    }

    /* ---------------- DATA MODIFICATION SECTION --------------- */
    const querySQL = `SELECT 
      id, email, name, designation, joindate, mobilenumber, workbase, 
      supervisor, natureofjob, visualacuity, trainingprogram1, trainingprogram2, 
      trainingprogram3, role, isactive, action, lastlogin, employeeId, 
      gender, date_of_birth, contract_duration_months
    FROM vausers WHERE email = ?`;

    const email = req.body.email;
    const valuesParams = [email];
    const data = await executeQuery({ query: querySQL, values: valuesParams });
    res.status(200).json({ users: data });
  } catch (error) {
    console.error("getuserdata API error:", error);
    res.status(500).json({ error: error.message });
  }
}
