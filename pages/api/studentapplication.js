/*
This function is called from students.jsx (Students link).
student registration form.
*/

import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  try {
    const body = req.body;
    // const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const currentDate = new Date();

    // Format the age (DOB) to YYYY-MM-DD without timezone
    const formattedAge = body.age ? new Date(body.age).toISOString().split("T")[0] : null;

    const values = [
      body.Quarter || null,
      body.SNo || null,
      body.Batch_ID || null,
      body.Program_Name || null,
      body.Trainee_ID || null,
      body.name || null,
      body.edu_qualifications || null,
      body.phone_number || null,
      body.alt_ph_num || null,
      body.CityDistrict_State || null,
      body.email || null,
      body.gender || null,
      formattedAge,
      body.visual_acuity || null,
      body.percent_loss || null,
      body.employment_status || null,
      body.Designation || null,
      body.Languages_Known || null,
      body.Program_ManagerCoordinator || null,
      body.country || null,
      body.state || null,
      body.city || null,
      body.disability || null,
      body.edu_details || "",
      body.objectives || null,
      body.first_choice || null,
      body.second_choice || null,
      body.third_choice || null,
      body.impairment_history || null,
      body.source || null,
      currentDate,
      body.id_proof || "",
      body.disability_cert || "",
      body.photo || "",
      body.bank_details || "",
      body.completion_status || null,
      body.reason_for_status || null,
      body.certification_eligibility || null,
      body.risk_factor || null,
      body.remarks || null,
      body.commenter || null,
    ];

    const result = await executeQuery({
      /*----- COLS: 42 NOT including: id -----*/
      query:
        "INSERT INTO vastudents (Quarter, SNo, Batch_ID, Program_Name, Trainee_ID, name, edu_qualifications, phone_number, alt_ph_num, CityDistrict_State, email, gender, age, visual_acuity, percent_loss, employment_status, Designation, Languages_Known, Program_ManagerCoordinator, country, state, city, disability, edu_details, objectives, first_choice, second_choice, third_choice, impairment_history, source, registration_date, id_proof, disability_cert, photo, bank_details, completion_status, reason_for_status, certification_eligibility, risk_factor, remarks, commenter) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      values: values,
    });
    // Return a JSON success response instead of redirecting
    res.status(200).json({
      success: true,
      message: "Student Registration Successful",
      studentId: result.insertId,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: error.message });
  }
}
